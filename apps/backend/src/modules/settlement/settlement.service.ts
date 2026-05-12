import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditStatus, PositionStatus, Prisma, SeasonStatus, UserRole } from '@prisma/client';
import {
  calculateNetLiquidationValue,
  calculatePositionValue,
  calculateVariableCapitalROI,
} from '@shared';
import { PrismaService } from '../../prisma/prisma.service';
import { toNumber } from '../teams/teams.service';

type AuthUser = { userId: string; email: string; role: UserRole };

type TeamForSettlement = Prisma.TeamGetPayload<{
  include: {
    season: true;
    portfolioPositions: {
      include: { quote: true };
    };
  };
}>;

type SettlementDraft = {
  seasonId: string;
  teamId: string;
  userId: string;
  totalCapitalDeposited: number;
  initialRosterCost: number;
  virtualCashBalance: number;
  activePositionsValue: number;
  applyFinalSellCommission: boolean;
  finalSellCommissionRate: number;
  finalSellCommissionAmount: number;
  netLiquidationValue: number;
  finalLiquidationValue: number;
  profitLoss: number;
  roiPct: number;
  rankByRoi: number | null;
  isPrizeEligible: boolean;
};

@Injectable()
export class SettlementService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateSeasonSettlement(seasonId: string, user: AuthUser) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) {
      throw new NotFoundException('Season not found');
    }

    const teams = await this.prisma.team.findMany({
      where: { seasonId },
      include: {
        season: true,
        portfolioPositions: {
          include: { quote: true },
        },
      },
    });

    const drafts = this.withRanks(teams.map((team) => this.buildSettlementDraft(team)));
    const settlements = [];

    for (const draft of drafts) {
      const existingStable = season.status === SeasonStatus.COMPLETED
        ? await this.finalSettlementDelegate().findFirst({
            where: { teamId: draft.teamId },
            orderBy: { calculatedAt: 'desc' },
          })
        : null;

      const settlement = existingStable ?? await this.finalSettlementDelegate().create({
        data: {
          seasonId: draft.seasonId,
          teamId: draft.teamId,
          userId: draft.userId,
          totalCapitalDeposited: draft.totalCapitalDeposited,
          initialRosterCost: draft.initialRosterCost,
          virtualCashBalance: draft.virtualCashBalance,
          activePositionsValue: draft.activePositionsValue,
          applyFinalSellCommission: draft.applyFinalSellCommission,
          finalSellCommissionRate: draft.finalSellCommissionRate,
          finalSellCommissionAmount: draft.finalSellCommissionAmount,
          netLiquidationValue: draft.netLiquidationValue,
          finalLiquidationValue: draft.finalLiquidationValue,
          profitLoss: draft.profitLoss,
          roiPct: draft.roiPct,
          rankByRoi: draft.rankByRoi,
          isPrizeEligible: draft.isPrizeEligible,
          calculatedById: user.userId,
        },
      });

      if (!existingStable) {
        await this.prisma.auditLog.create({
          data: {
            action: 'CALCULATE_FINAL_SETTLEMENT' as any,
            userId: user.userId,
            seasonId,
            entityType: 'FinalSettlement',
            entityId: settlement.id,
            detail: {
              teamId: draft.teamId,
              totalCapitalDeposited: draft.totalCapitalDeposited,
              finalLiquidationValue: draft.finalLiquidationValue,
              profitLoss: draft.profitLoss,
              roiPct: draft.roiPct,
              rankByRoi: draft.rankByRoi,
              applyFinalSellCommission: draft.applyFinalSellCommission,
            },
            status: AuditStatus.SUCCESS,
          },
        });
      }

      settlements.push(this.serializeSettlement(settlement, Boolean(existingStable)));
    }

    return {
      seasonId,
      status: season.status,
      applyFinalSellCommission: true,
      settlementCount: settlements.length,
      stable: season.status === SeasonStatus.COMPLETED,
      settlements,
    };
  }

  async getTeamFinalSettlement(teamId: string, user: AuthUser) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        season: true,
        portfolioPositions: {
          include: { quote: true },
        },
      },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    this.assertCanRead(team.userId, user);

    const latest = await this.finalSettlementDelegate().findFirst({
      where: { teamId },
      orderBy: { calculatedAt: 'desc' },
    });
    if (latest) {
      return this.serializeSettlement(latest, true);
    }

    const teams = await this.prisma.team.findMany({
      where: { seasonId: team.seasonId },
      include: {
        season: true,
        portfolioPositions: {
          include: { quote: true },
        },
      },
    });
    const draft = this.withRanks(teams.map((item) => this.buildSettlementDraft(item)))
      .find((item) => item.teamId === teamId);
    if (!draft) {
      throw new NotFoundException('Team not found');
    }

    return {
      ...draft,
      persisted: false,
      stable: false,
      calculatedAt: null,
      source: 'FINAL_SETTLEMENT_PREVIEW',
    };
  }

  private buildSettlementDraft(team: TeamForSettlement) {
    const activePositions = team.portfolioPositions.filter((position) => position.status === PositionStatus.ACTIVE);
    const activePositionsValue = activePositions.reduce((sum, position) => sum + calculatePositionValue(
      toNumber(position.initialQuote),
      toNumber(position.quote.currentQuote),
      toNumber(position.fantasyMultiplier),
    ), 0);
    const totalCapitalDeposited = toNumber(team.initialBudget);
    const initialRosterCost = activePositions.reduce((sum, position) => sum + toNumber(position.buyValue), 0);
    const virtualCashBalance = toNumber(team.availableBudget);
    const applyFinalSellCommission = true;
    const finalSellCommissionRate = applyFinalSellCommission ? toNumber(team.season.sellCommissionRate) : 0;
    const netLiquidationValue = applyFinalSellCommission
      ? calculateNetLiquidationValue(activePositionsValue, finalSellCommissionRate)
      : activePositionsValue;
    const finalSellCommissionAmount = activePositionsValue - netLiquidationValue;
    const finalLiquidationValue = netLiquidationValue + virtualCashBalance;
    const profitLoss = finalLiquidationValue - totalCapitalDeposited;
    const roiPct = calculateVariableCapitalROI(netLiquidationValue, virtualCashBalance, totalCapitalDeposited);
    const prizeThresholdPct = this.prizeThresholdPct(team.season.prizeThreshold);

    return {
      seasonId: team.seasonId,
      teamId: team.id,
      userId: team.userId,
      totalCapitalDeposited,
      initialRosterCost,
      virtualCashBalance,
      activePositionsValue,
      applyFinalSellCommission,
      finalSellCommissionRate,
      finalSellCommissionAmount,
      netLiquidationValue,
      finalLiquidationValue,
      profitLoss,
      roiPct,
      rankByRoi: null as number | null,
      isPrizeEligible: roiPct >= prizeThresholdPct,
    };
  }

  private withRanks(drafts: SettlementDraft[]) {
    return [...drafts]
      .sort((a, b) => {
        if (b.roiPct !== a.roiPct) return b.roiPct - a.roiPct;
        return b.finalLiquidationValue - a.finalLiquidationValue;
      })
      .map((draft, index) => ({ ...draft, rankByRoi: index + 1 }));
  }

  private prizeThresholdPct(value: Prisma.Decimal | number) {
    const raw = toNumber(value);
    return raw <= 1 ? raw * 100 : raw;
  }

  private assertCanRead(teamUserId: string, user: AuthUser) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return;
    }
    if (teamUserId !== user.userId) {
      throw new ForbiddenException('Cannot access another user team settlement');
    }
  }

  private finalSettlementDelegate() {
    return (this.prisma as unknown as { finalSettlement: {
      findFirst: (args: unknown) => Promise<any>;
      create: (args: unknown) => Promise<any>;
    } }).finalSettlement;
  }

  private serializeSettlement(settlement: {
    id: string;
    seasonId: string;
    teamId: string;
    userId: string;
    totalCapitalDeposited: Prisma.Decimal | number;
    initialRosterCost: Prisma.Decimal | number;
    virtualCashBalance: Prisma.Decimal | number;
    activePositionsValue: Prisma.Decimal | number;
    applyFinalSellCommission: boolean;
    finalSellCommissionRate: Prisma.Decimal | number;
    finalSellCommissionAmount: Prisma.Decimal | number;
    netLiquidationValue: Prisma.Decimal | number;
    finalLiquidationValue: Prisma.Decimal | number;
    profitLoss: Prisma.Decimal | number;
    roiPct: Prisma.Decimal | number;
    rankByRoi: number | null;
    isPrizeEligible: boolean;
    calculatedAt: Date;
    source: string;
  }, stable: boolean) {
    return {
      id: settlement.id,
      seasonId: settlement.seasonId,
      teamId: settlement.teamId,
      userId: settlement.userId,
      totalCapitalDeposited: toNumber(settlement.totalCapitalDeposited),
      initialRosterCost: toNumber(settlement.initialRosterCost),
      virtualCashBalance: toNumber(settlement.virtualCashBalance),
      activePositionsValue: toNumber(settlement.activePositionsValue),
      applyFinalSellCommission: settlement.applyFinalSellCommission,
      finalSellCommissionRate: toNumber(settlement.finalSellCommissionRate),
      finalSellCommissionAmount: toNumber(settlement.finalSellCommissionAmount),
      netLiquidationValue: toNumber(settlement.netLiquidationValue),
      finalLiquidationValue: toNumber(settlement.finalLiquidationValue),
      profitLoss: toNumber(settlement.profitLoss),
      roiPct: toNumber(settlement.roiPct),
      rankByRoi: settlement.rankByRoi,
      isPrizeEligible: settlement.isPrizeEligible,
      calculatedAt: settlement.calculatedAt,
      persisted: true,
      stable,
      source: settlement.source,
    };
  }
}
