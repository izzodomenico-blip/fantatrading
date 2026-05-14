import { SELL_COMMISSION_RATE, type DemoPosition } from '../mock/favcDemoData';
import { formatSignedPercent } from './format';
import { BUY_COMMISSION_RATE } from '../mock/favcDemoData';
import { calculateEstimatedPositionValue } from './playerTrend';
import { calculateTeamBandLabel, getOfficialBonusMalusPct, type TeamBand } from './bonusMalusTable';
import {
  getPlayerRoundSnapshot,
  type PlayerRoundMemory,
  type PlayerRoundPoint,
} from './playerRoundMemory';

export type PlayerRoundSnapshot = {
  playerId: string;
  name: string;
  role: string;
  club: string;
  quote: number;
  quoteChange: number;
  vote: number | null;
  fantasyVote: number | null;
  played: boolean;
  isSv: boolean;
  goals?: number | null;
  assists?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
  ownGoals?: number | null;
  penaltySaved?: number | null;
  penaltyMissed?: number | null;
  fantasyBonusPct: number;
  valueBefore: number;
  estimatedValue: number;
  valueDelta: number;
  profitLoss: number;
  roiPct: number;
  sourceQuote: PlayerRoundPoint['sourceQuote'];
  sourceVote: PlayerRoundPoint['sourceVote'];
  trend: PlayerRoundPoint[];
};

export type TeamRoundSnapshot = {
  teamId: string;
  seasonId: string;
  round: number;
  activePlayersCount: number;
  playersWithVote: number;
  svCount: number;
  teamVoteSum: number;
  teamVoteAverage: number | null;
  teamBand: number;
  teamBandLabel: TeamBand;
  teamBandBonusMalusPct: number;
  capitalAdded: number;
  totalSpentPlayers: number;
  buyCommissions: number;
  sellCommissions: number;
  grossPositionsValue: number;
  netLiquidationValue: number;
  virtualCashBalance: number;
  totalCapitalDeposited: number;
  finalLiquidationValue: number;
  profitLoss: number;
  roiPct: number;
  bestPlayer: PlayerRoundSnapshot | null;
  worstPlayer: PlayerRoundSnapshot | null;
  topPlayers: PlayerRoundSnapshot[];
  bottomPlayers: PlayerRoundSnapshot[];
  playerSnapshots: PlayerRoundSnapshot[];
};

export type ReplayPosition = DemoPosition & {
  backendPlayerId?: string;
};

export function calculateTeamBand(teamVoteAverage: number | null) {
  if (teamVoteAverage === null) return 0;
  if (teamVoteAverage >= 7) return 5;
  if (teamVoteAverage >= 6.5) return 4;
  if (teamVoteAverage >= 6) return 3;
  if (teamVoteAverage >= 5.5) return 2;
  return 1;
}

export function buildTeamRoundSnapshot(
  input: {
    teamId: string;
    seasonId: string;
    virtualCashBalance: number;
    totalCapitalDeposited: number;
  },
  positions: ReplayPosition[],
  roundMemory: Map<string, PlayerRoundMemory>,
  round: number,
): TeamRoundSnapshot {
  const activePositions = positions.filter(position => position.status === 'ACTIVE');
  const baseSnapshots = activePositions.map(position => {
    const memory = roundMemory.get(position.playerId ?? position.id) ?? roundMemory.get(position.id);
    const point = getPlayerRoundSnapshot(memory, round);
    return { position, memory, point };
  });
  const playersWithVote = baseSnapshots.filter(({ point }) => point && !point.isSv).length;
  const teamVoteSum = baseSnapshots.reduce((sum, { point }) => sum + (point?.isSv ? 0 : point?.vote ?? 0), 0);
  const teamVoteAverage = playersWithVote > 0 ? Number((teamVoteSum / playersWithVote).toFixed(2)) : null;
  const teamBand = calculateTeamBand(teamVoteAverage);
  const teamBandLabel = calculateTeamBandLabel(teamVoteAverage);

  const playerSnapshots = baseSnapshots.map<PlayerRoundSnapshot>(({ position, memory, point }) => {
    const quote = point?.quote ?? position.currentQuote;
    const previousPoint = memory?.rounds.filter(item => item.round < round).at(-1);
    const valueBefore = previousPoint?.estimatedValue ?? position.initialQuote;
    const fantasyBonusPct = getOfficialBonusMalusPct(teamBandLabel, point?.vote ?? null, point?.isSv ?? true);
    const quoteOnlyValue = calculateEstimatedPositionValue(position.initialQuote, quote, position.fantasyMultiplier);
    const estimatedValue = Number((quoteOnlyValue * (1 + fantasyBonusPct / 100)).toFixed(2));
    const valueDelta = Number((estimatedValue - valueBefore).toFixed(2));
    const profitLoss = estimatedValue - position.initialQuote;
    const roiPct = position.initialQuote > 0 ? (profitLoss / position.initialQuote) * 100 : 0;

    return {
      playerId: position.playerId ?? position.id,
      name: position.playerName,
      role: position.role,
      club: position.realTeam,
      quote,
      quoteChange: point?.quoteChange ?? 0,
      vote: point?.vote ?? null,
      fantasyVote: point?.fantasyVote ?? null,
      played: point?.played ?? false,
      isSv: point?.isSv ?? true,
      goals: point?.goals ?? null,
      assists: point?.assists ?? null,
      yellowCards: point?.yellowCards ?? null,
      redCards: point?.redCards ?? null,
      ownGoals: point?.ownGoals ?? null,
      penaltySaved: point?.penaltySaved ?? null,
      penaltyMissed: point?.penaltyMissed ?? null,
      fantasyBonusPct,
      valueBefore: Number(valueBefore.toFixed(2)),
      estimatedValue,
      valueDelta,
      profitLoss: Number(profitLoss.toFixed(2)),
      roiPct: Number(roiPct.toFixed(2)),
      sourceQuote: point?.sourceQuote ?? 'mock',
      sourceVote: point?.sourceVote ?? 'missing',
      trend: memory?.rounds ?? [],
    };
  });
  const svCount = playerSnapshots.length - playersWithVote;
  const grossPositionsValue = Number(playerSnapshots.reduce((sum, player) => sum + player.estimatedValue, 0).toFixed(2));
  const totalSpentPlayers = Number(activePositions.reduce((sum, position) => sum + position.initialQuote, 0).toFixed(2));
  const buyCommissions = Number((totalSpentPlayers * BUY_COMMISSION_RATE).toFixed(2));
  const sellCommissions = 0;
  const netLiquidationValue = Number((grossPositionsValue * (1 - SELL_COMMISSION_RATE)).toFixed(2));
  const finalLiquidationValue = Number((netLiquidationValue + input.virtualCashBalance).toFixed(2));
  const profitLoss = Number((finalLiquidationValue - input.totalCapitalDeposited).toFixed(2));
  const roiPct = input.totalCapitalDeposited > 0 ? Number(((profitLoss / input.totalCapitalDeposited) * 100).toFixed(2)) : 0;
  const teamBandBonusMalusPct = Number((playerSnapshots.reduce((sum, player) => sum + player.fantasyBonusPct, 0) / Math.max(1, playersWithVote)).toFixed(2));
  const ranked = [...playerSnapshots].sort((a, b) => b.roiPct - a.roiPct);

  return {
    teamId: input.teamId,
    seasonId: input.seasonId,
    round,
    activePlayersCount: activePositions.length,
    playersWithVote,
    svCount,
    teamVoteSum: Number(teamVoteSum.toFixed(2)),
    teamVoteAverage,
    teamBand,
    teamBandLabel,
    teamBandBonusMalusPct,
    capitalAdded: 0,
    totalSpentPlayers,
    buyCommissions,
    sellCommissions,
    grossPositionsValue,
    netLiquidationValue,
    virtualCashBalance: input.virtualCashBalance,
    totalCapitalDeposited: input.totalCapitalDeposited,
    finalLiquidationValue,
    profitLoss,
    roiPct,
    bestPlayer: ranked[0] ?? null,
    worstPlayer: ranked.at(-1) ?? null,
    topPlayers: ranked.slice(0, 5),
    bottomPlayers: ranked.slice(-5).reverse(),
    playerSnapshots,
  };
}

export function buildTeamReplay(
  input: {
    teamId: string;
    seasonId: string;
    virtualCashBalance: number;
    totalCapitalDeposited: number;
  },
  positions: ReplayPosition[],
  roundMemory: Map<string, PlayerRoundMemory>,
  maxRound: number,
) {
  return Array.from({ length: maxRound }, (_, index) =>
    buildTeamRoundSnapshot(input, positions, roundMemory, index + 1),
  );
}

export function buildRoundLog(snapshot: TeamRoundSnapshot) {
  const average = snapshot.teamVoteAverage === null ? 'n.d.' : snapshot.teamVoteAverage.toFixed(2).replace('.', ',');
  const best = snapshot.bestPlayer?.name ?? 'n.d.';
  return `Giornata ${snapshot.round}: ${snapshot.playersWithVote} giocatori con voto, ${snapshot.svCount} SV, media squadra ${average}, ${snapshot.teamBandLabel.replace('_', ' ')}, rendimento squadra ${formatSignedPercent(snapshot.roiPct)}. Miglior giocatore: ${best}.`;
}
