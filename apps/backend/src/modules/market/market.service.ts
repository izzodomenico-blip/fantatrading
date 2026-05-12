import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OperationType, PlayerRole, PositionStatus, Prisma, UserRole } from '@prisma/client';
import {
  calculateBuyCost,
  calculatePositionValue,
  calculateSellProceeds,
  V1_ROSTER_COMPOSITION,
} from '@shared';
import { PrismaService } from '../../prisma/prisma.service';
import { compositionByRole, TeamsService, toNumber } from '../teams/teams.service';
import { BuyPlayerDto } from './dto/buy-player.dto';
import { SellPlayerDto } from './dto/sell-player.dto';

type AuthUser = { userId: string; email: string; role: UserRole };

type TeamForMarket = Prisma.TeamGetPayload<{
  include: {
    season: true;
    portfolioPositions: { include: { player: true; quote: true } };
  };
}>;

const ROLE_LIMITS: Record<PlayerRole, number> = {
  [PlayerRole.GK]: V1_ROSTER_COMPOSITION.GK,
  [PlayerRole.DEF]: V1_ROSTER_COMPOSITION.DEF,
  [PlayerRole.MID]: V1_ROSTER_COMPOSITION.MID,
  [PlayerRole.FWD]: V1_ROSTER_COMPOSITION.FWD,
};

@Injectable()
export class MarketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
  ) {}

  async buyPlayer(user: AuthUser, dto: BuyPlayerDto) {
    await this.teamsService.assertParticipantOwner(dto.teamId, user);
    const team = await this.getTeamForMarket(dto.teamId);
    const activePositions = team.portfolioPositions.filter((position) => position.status === PositionStatus.ACTIVE);

    if (activePositions.some((position) => position.playerId === dto.playerId)) {
      throw new BadRequestException('Player already present in active roster');
    }

    const quote = await this.prisma.quote.findUnique({
      where: { seasonId_playerId: { seasonId: team.seasonId, playerId: dto.playerId } },
      include: { player: true },
    });
    if (!quote) {
      throw new BadRequestException('Player does not belong to this season');
    }

    this.validateRosterCapacity(activePositions.map((position) => position.player.role), quote.player.role);

    const buyCommissionRate = toNumber(team.season.buyCommissionRate);
    const grossAmount = toNumber(quote.currentQuote);
    const buyCost = calculateBuyCost(grossAmount, buyCommissionRate);
    const budgetBefore = toNumber(team.availableBudget);

    // FAVC: se la liquidità è insufficiente, l'utente deposita capitale aggiuntivo.
    // Il deficit aumenta totalCapitalDeposited (initialBudget nel DB).
    const capitalToAdd = Math.max(0, buyCost.totalCost - budgetBefore);
    const newInitialBudget = toNumber(team.initialBudget) + capitalToAdd;
    const budgetAfter = budgetBefore + capitalToAdd - buyCost.totalCost;

    const position = await this.prisma.portfolioPosition.create({
      data: {
        teamId: team.id,
        playerId: quote.playerId,
        quoteId: quote.id,
        initialQuote: grossAmount,
        buyValue: buyCost.grossValue,
        buyCommission: buyCost.commission,
        totalBuyCost: buyCost.totalCost,
        fantasyMultiplier: 1,
        currentSellValue: calculatePositionValue(grossAmount, toNumber(quote.currentQuote), 1),
        status: PositionStatus.ACTIVE,
      },
      include: { player: true, quote: true },
    });

    await this.prisma.marketOperation.create({
      data: {
        teamId: team.id,
        playerId: quote.playerId,
        positionId: position.id,
        type: OperationType.BUY,
        valueAtOperation: buyCost.grossValue,
        commissionRate: buyCommissionRate,
        commissionAmount: buyCost.commission,
        netAmount: buyCost.totalCost,
        budgetBefore,
        budgetAfter,
      },
    });

    await this.prisma.team.update({
      where: { id: team.id },
      data: {
        availableBudget: budgetAfter,
        initialBudget: newInitialBudget,
        totalCommissionsPaid: toNumber(team.totalCommissionsPaid) + buyCost.commission,
      },
    });
    const portfolio = await this.teamsService.refreshTeamFinancials(team.id);

    return {
      operation: {
        type: OperationType.BUY,
        grossAmount: buyCost.grossValue,
        commissionAmount: buyCost.commission,
        netAmount: buyCost.totalCost,
        systemRevenue: buyCost.commission,
      },
      position,
      portfolio,
    };
  }

  async sellPlayer(user: AuthUser, dto: SellPlayerDto) {
    if (!dto.playerId && !dto.positionId) {
      throw new BadRequestException('playerId or positionId is required');
    }
    await this.teamsService.assertParticipantOwner(dto.teamId, user);
    const team = await this.getTeamForMarket(dto.teamId);
    const position = team.portfolioPositions.find((item) =>
      item.status === PositionStatus.ACTIVE &&
      (dto.positionId ? item.id === dto.positionId : item.playerId === dto.playerId),
    );
    if (!position) {
      throw new NotFoundException('Active portfolio position not found');
    }

    const sellCommissionRate = toNumber(team.season.sellCommissionRate);
    const grossAmount = calculatePositionValue(
      toNumber(position.initialQuote),
      toNumber(position.quote.currentQuote),
      toNumber(position.fantasyMultiplier),
    );
    const proceeds = calculateSellProceeds(grossAmount, sellCommissionRate);
    const budgetBefore = toNumber(team.availableBudget);
    const budgetAfter = budgetBefore + proceeds.netProceeds;

    await this.prisma.portfolioPosition.update({
      where: { id: position.id },
      data: {
        status: PositionStatus.SOLD,
        currentSellValue: grossAmount,
      },
    });

    await this.prisma.marketOperation.create({
      data: {
        teamId: team.id,
        playerId: position.playerId,
        positionId: position.id,
        type: OperationType.SELL,
        valueAtOperation: proceeds.grossValue,
        commissionRate: sellCommissionRate,
        commissionAmount: proceeds.commission,
        netAmount: proceeds.netProceeds,
        budgetBefore,
        budgetAfter,
      },
    });

    await this.prisma.team.update({
      where: { id: team.id },
      data: {
        availableBudget: budgetAfter,
        totalCommissionsPaid: toNumber(team.totalCommissionsPaid) + proceeds.commission,
      },
    });
    const portfolio = await this.teamsService.refreshTeamFinancials(team.id);

    return {
      operation: {
        type: OperationType.SELL,
        grossAmount: proceeds.grossValue,
        commissionAmount: proceeds.commission,
        netAmount: proceeds.netProceeds,
        systemRevenue: proceeds.commission,
      },
      portfolio,
    };
  }

  async listOperations(user: AuthUser, teamId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    if (user.role === UserRole.PARTICIPANT && team.userId !== user.userId) {
      throw new ForbiddenException('Cannot access another user team');
    }

    const operations = await this.prisma.marketOperation.findMany({
      where: { teamId },
      include: { player: true },
      orderBy: { executedAt: 'asc' },
    });

    return operations.map((operation) => ({
      ...operation,
      grossAmount: toNumber(operation.valueAtOperation),
      commissionAmount: toNumber(operation.commissionAmount),
      netAmount: toNumber(operation.netAmount),
      systemRevenue: toNumber(operation.commissionAmount),
      valueAtOperation: toNumber(operation.valueAtOperation),
      commissionRate: toNumber(operation.commissionRate),
      budgetBefore: toNumber(operation.budgetBefore),
      budgetAfter: toNumber(operation.budgetAfter),
    }));
  }

  private async getTeamForMarket(teamId: string): Promise<TeamForMarket> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        season: true,
        portfolioPositions: {
          include: { player: true, quote: true },
        },
      },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return team;
  }

  private validateRosterCapacity(activeRoles: PlayerRole[], newRole: PlayerRole) {
    if (activeRoles.length >= V1_ROSTER_COMPOSITION.total) {
      throw new BadRequestException('Roster already has 25 players');
    }
    const composition = compositionByRole(activeRoles);
    if (composition[newRole] + 1 > ROLE_LIMITS[newRole]) {
      throw new BadRequestException(`Roster role limit exceeded for ${newRole}`);
    }
  }
}
