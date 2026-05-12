import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PlayerRole, PositionStatus, Prisma, TeamStatus, UserRole } from '@prisma/client';
import { calculatePositionValue, calculateROI, V1_ROSTER_COMPOSITION } from '@shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

type AuthUser = { userId: string; email: string; role: UserRole };

type TeamWithRelations = Prisma.TeamGetPayload<{
  include: {
    season: true;
    user: true;
    portfolioPositions: {
      include: { player: true; quote: true };
    };
  };
}>;

const ROLE_LIMITS: Record<PlayerRole, number> = {
  [PlayerRole.GK]: V1_ROSTER_COMPOSITION.GK,
  [PlayerRole.DEF]: V1_ROSTER_COMPOSITION.DEF,
  [PlayerRole.MID]: V1_ROSTER_COMPOSITION.MID,
  [PlayerRole.FWD]: V1_ROSTER_COMPOSITION.FWD,
};

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTeam(user: AuthUser, dto: CreateTeamDto) {
    if (user.role !== UserRole.PARTICIPANT) {
      throw new ForbiddenException('Only participants can create teams');
    }

    const season = await this.prisma.season.findUnique({ where: { id: dto.seasonId } });
    if (!season) {
      throw new NotFoundException('Season not found');
    }

    const existing = await this.prisma.team.findUnique({
      where: { userId_seasonId: { userId: user.userId, seasonId: dto.seasonId } },
    });
    if (existing) {
      throw new ConflictException('User already has a team for this season');
    }

    const initialBudget = toNumber(season.initialBudget);
    const team = await this.prisma.team.create({
      data: {
        userId: user.userId,
        seasonId: dto.seasonId,
        status: TeamStatus.ROSA_INCOMPLETA,
        initialBudget,
        availableBudget: initialBudget,
        totalCommissionsPaid: 0,
        currentPortfolioValue: 0,
        currentRoi: 0,
      },
      include: { season: true },
    });

    return this.serializeTeam(team);
  }

  async listMyTeams(user: AuthUser) {
    const teams = await this.prisma.team.findMany({
      where: user.role === UserRole.PARTICIPANT ? { userId: user.userId } : {},
      include: { season: true },
      orderBy: { registeredAt: 'desc' },
    });
    return teams.map((team) => this.serializeTeam(team));
  }

  async getTeam(id: string, user: AuthUser) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: { season: true, user: true },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    this.assertCanRead(team.userId, user);
    return this.serializeTeam(team);
  }

  async getPortfolio(id: string, user: AuthUser) {
    const team = await this.findTeamWithPortfolio(id);
    this.assertCanRead(team.userId, user);
    return this.buildPortfolioSummary(team);
  }

  async assertParticipantOwner(teamId: string, user: AuthUser) {
    if (user.role !== UserRole.PARTICIPANT) {
      throw new ForbiddenException('Admins can read teams but cannot operate as users');
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { season: true },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    if (team.userId !== user.userId) {
      throw new ForbiddenException('Cannot operate on another user team');
    }
    return team;
  }

  async refreshTeamFinancials(teamId: string) {
    const team = await this.findTeamWithPortfolio(teamId);
    const activePositions = team.portfolioPositions.filter((position) => position.status === PositionStatus.ACTIVE);
    const currentPortfolioValue = activePositions.reduce((sum, position) => sum + this.positionCurrentValue(position), 0);
    const currentRoi = calculateROI(currentPortfolioValue, toNumber(team.availableBudget), toNumber(team.initialBudget));

    await this.prisma.team.update({
      where: { id: teamId },
      data: {
        currentPortfolioValue,
        currentRoi,
        status: activePositions.length === V1_ROSTER_COMPOSITION.total ? TeamStatus.ROSA_ATTIVA : TeamStatus.ROSA_INCOMPLETA,
      },
    });

    return this.getPortfolio(teamId, { userId: team.userId, email: '', role: UserRole.PARTICIPANT });
  }

  private async findTeamWithPortfolio(id: string): Promise<TeamWithRelations> {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        season: true,
        user: true,
        portfolioPositions: {
          include: { player: true, quote: true },
          orderBy: { boughtAt: 'asc' },
        },
      },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return team;
  }

  private assertCanRead(teamUserId: string, user: AuthUser) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return;
    }
    if (teamUserId !== user.userId) {
      throw new ForbiddenException('Cannot access another user team');
    }
  }

  private buildPortfolioSummary(team: TeamWithRelations) {
    const activePositions = team.portfolioPositions.filter((position) => position.status === PositionStatus.ACTIVE);
    const positions = activePositions.map((position) => ({
      id: position.id,
      teamId: position.teamId,
      playerId: position.playerId,
      role: position.player.role,
      playerName: [position.player.firstName, position.player.lastName].filter(Boolean).join(' '),
      initialQuote: toNumber(position.initialQuote),
      currentQuote: toNumber(position.quote.currentQuote),
      buyPrice: toNumber(position.buyValue),
      currentValue: this.positionCurrentValue(position),
      quantity: 1,
      units: 1,
      fantasyMultiplier: toNumber(position.fantasyMultiplier),
      isActive: position.status === PositionStatus.ACTIVE,
    }));
    const composition = compositionByRole(activePositions.map((position) => position.player.role));
    const currentPortfolioValue = positions.reduce((sum, position) => sum + position.currentValue, 0);
    const availableBudget = toNumber(team.availableBudget);
    const initialBudget = toNumber(team.initialBudget);
    const roi = calculateROI(currentPortfolioValue, availableBudget, initialBudget);
    const totalPlayers = positions.length;

    return {
      team: this.serializeTeam(team),
      positions,
      summary: {
        initialValue: initialBudget,
        availableBudget,
        currentPortfolioValue,
        currentTotalValue: currentPortfolioValue + availableBudget,
        totalCommissionsPaid: toNumber(team.totalCommissionsPaid),
        currentRoi: roi,
        playerCount: totalPlayers,
        composition,
        rosterLimits: ROLE_LIMITS,
        isRosterComplete: totalPlayers === V1_ROSTER_COMPOSITION.total && Object.entries(ROLE_LIMITS).every(([role, limit]) => composition[role as PlayerRole] === limit),
        isRosterValid: totalPlayers <= V1_ROSTER_COMPOSITION.total && Object.entries(ROLE_LIMITS).every(([role, limit]) => composition[role as PlayerRole] <= limit),
      },
    };
  }

  private positionCurrentValue(position: { initialQuote: Prisma.Decimal | number; quote: { currentQuote: Prisma.Decimal | number }; fantasyMultiplier: Prisma.Decimal | number }) {
    return calculatePositionValue(
      toNumber(position.initialQuote),
      toNumber(position.quote.currentQuote),
      toNumber(position.fantasyMultiplier),
    );
  }

  private serializeTeam(team: {
    id: string;
    userId: string;
    seasonId: string;
    status: TeamStatus;
    initialBudget: Prisma.Decimal | number;
    availableBudget: Prisma.Decimal | number;
    totalCommissionsPaid: Prisma.Decimal | number;
    currentPortfolioValue: Prisma.Decimal | number;
    currentRoi: Prisma.Decimal | number;
    registeredAt?: Date;
    updatedAt?: Date;
    season?: unknown;
  }) {
    return {
      ...team,
      status: mapTeamStatus(team.status),
      internalStatus: team.status,
      initialBudget: toNumber(team.initialBudget),
      availableBudget: toNumber(team.availableBudget),
      totalCommissionsPaid: toNumber(team.totalCommissionsPaid),
      currentPortfolioValue: toNumber(team.currentPortfolioValue),
      currentRoi: toNumber(team.currentRoi),
    };
  }
}

export function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function compositionByRole(roles: PlayerRole[]): Record<PlayerRole, number> {
  return {
    [PlayerRole.GK]: roles.filter((role) => role === PlayerRole.GK).length,
    [PlayerRole.DEF]: roles.filter((role) => role === PlayerRole.DEF).length,
    [PlayerRole.MID]: roles.filter((role) => role === PlayerRole.MID).length,
    [PlayerRole.FWD]: roles.filter((role) => role === PlayerRole.FWD).length,
  };
}

function mapTeamStatus(status: TeamStatus): 'DRAFT' | 'ACTIVE' | 'LOCKED' | 'CLOSED' {
  if (status === TeamStatus.ROSA_ATTIVA) return 'ACTIVE';
  if (status === TeamStatus.STAGIONE_CONCLUSA) return 'CLOSED';
  return 'DRAFT';
}
