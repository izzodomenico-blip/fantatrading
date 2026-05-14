import { useEffect, useMemo, useState } from 'react';
import {
  createFantaTradingApi,
  FantaTradingApi,
  getDemoAccessTokenForEmail,
  type BackendPlayer,
  type BackendPortfolio,
  type BackendVote,
} from '../api';
import { Link } from 'react-router-dom';
import { EmptyState, MetricCard, Section, StatusBadges } from '../components';
import type { PlayerCardData } from './PlayerCard';
import PlayerDetailDrawer from './PlayerDetailDrawer';
import PlayerTrendChart from './PlayerTrendChart';
import TeamTrendChart from './TeamTrendChart';
import {
  roleLimits,
  roleNames,
  type FavcRole,
} from '../mock/favcDemoData';
import { formatCredits, formatSignedCredits, formatSignedPercent, valueTone } from '../utils/format';
import {
  buildPlayerRoundMemory,
  type PlayerRoundMemory,
  type RawSyntheticRoundQuote,
  type RawVoteRow,
} from '../utils/playerRoundMemory';
import {
  buildRoundLog,
  buildTeamReplay,
  type PlayerRoundSnapshot,
  type ReplayPosition,
  type TeamRoundSnapshot,
} from '../utils/teamRoundSimulation';
import {
  advanceRound,
  clampRound,
  previousRound,
  rankTeamsByRoi,
  readReplayState,
  resetRound,
  writeReplayState,
  readActiveSimulationTeam,
  setActiveSimulationTeam,
} from '../utils/seasonReplay';
import type { TeamTrendPoint } from '../utils/teamTrend';
import {
  buildLocalRosterStateAtRound,
  computeBuyTrade,
  computeSellTrade,
  deleteLocalRoster,
  getActiveLocalRosterId,
  readLocalRosters,
  setActiveLocalRosterId,
  upsertLocalRoster,
  type LocalRoster,
  type LocalRosterTrade,
} from '../utils/localRosters';
import { SELL_COMMISSION_RATE, type DemoMarketPlayer } from '../mock/favcDemoData';
import { buildTeamRoundSnapshot } from '../utils/teamRoundSimulation';
import LocalRosterTradePanel from './LocalRosterTradePanel';
import FantacalcioLivePanel from './FantacalcioLivePanel';

type Props = {
  seasonId?: string | null;
  seasonLabel?: string;
  marketPlayers?: DemoMarketPlayer[];
};

type DemoTeamConfig = {
  key: string;
  label: string;
  shortLabel: string;
  email: string;
  description: string;
  kind?: 'active' | 'demo';
};

type LoadedDemoTeam = DemoTeamConfig & {
  teamId: string;
  positions: ReplayPosition[];
  roundMemory: Map<string, PlayerRoundMemory>;
  replay: TeamRoundSnapshot[];
  maxRound: number;
  quoteSource: 'official' | 'synthetic' | 'mock';
  voteMaxRound: number;
  roster?: LocalRoster;
};

const DEMO_TEAMS: DemoTeamConfig[] = [
  {
    key: 'VALUE',
    label: 'Team Demo VALUE',
    shortLabel: 'VALUE',
    email: 'demo-value@fantatrading.local',
    description: 'Rapporto trend/prezzo',
  },
  {
    key: 'LOW_COST',
    label: 'Team Demo LOW COST',
    shortLabel: 'LOW COST',
    email: 'demo-lowcost@fantatrading.local',
    description: 'Rosa economica',
  },
  {
    key: 'TOP_PLAYER',
    label: 'Team Demo TOP PLAYER',
    shortLabel: 'TOP PLAYER',
    email: 'demo-top@fantatrading.local',
    description: 'Quote piu alte',
  },
  {
    key: 'BALANCED',
    label: 'Team Demo BALANCED',
    shortLabel: 'BALANCED',
    email: 'demo-balanced@fantatrading.local',
    description: 'Equilibrio ruolo/prezzo/trend',
  },
];

const ACTIVE_TEAM_KEY = 'MY_TEAM';

const STORAGE_KEY = 'fantatrading_season_replay_2025_26';
const TARGET_MAX_ROUND = 36;

const syntheticQuoteModules = import.meta.glob<{ rows: RawSyntheticRoundQuote[] }>(
  '@data/real/processed/round-quotes/synthetic_round_quotes_history.json',
  { import: 'default' },
);

async function loadSyntheticQuoteRows() {
  const loaders = Object.values(syntheticQuoteModules);
  if (loaders.length === 0) return [];
  const report = await loaders[0]();
  return report.rows ?? [];
}

function mapBackendRole(role: string): FavcRole {
  if (role === 'GK' || role === 'P') return 'P';
  if (role === 'DEF' || role === 'D') return 'D';
  if (role === 'MID' || role === 'C') return 'C';
  return 'A';
}

function backendPlayerName(player: BackendPlayer) {
  return [player.firstName, player.lastName].filter(Boolean).join(' ').trim() || player.lastName || player.id;
}

function votesToRows(votes: BackendVote[]): RawVoteRow[] {
  return votes.map(vote => ({
    round: vote.round,
    playerId: vote.playerId,
    vote: vote.vote ?? null,
    fantasyVote: vote.fantasyVote ?? null,
    played: vote.played,
    goals: vote.goals ?? null,
    assists: vote.assists ?? null,
    yellowCards: vote.yellowCards ?? null,
    redCards: vote.redCards ?? null,
    ownGoals: vote.ownGoals ?? null,
    penaltySaved: vote.penaltySaved ?? null,
    penaltyMissed: vote.penaltyMissed ?? null,
  }));
}

function normalizePositions(portfolio: BackendPortfolio, players: BackendPlayer[]) {
  return portfolio.positions.map<ReplayPosition>(position => {
    const player = players.find(item => item.id === position.playerId);
    const initialQuote = Number(position.initialQuote || position.buyPrice || position.currentQuote || 1);
    const currentQuote = Number(position.currentQuote || initialQuote);
    const playerName = position.playerName || (player ? backendPlayerName(player) : position.playerId);

    return {
      id: position.id,
      backendPlayerId: position.playerId,
      playerId: player?.externalId ?? position.playerId,
      playerName,
      realTeam: player?.realTeam ?? 'Backend',
      role: mapBackendRole(position.role),
      initialQuote,
      currentQuote,
      fantasyMultiplier: Number(position.fantasyMultiplier || 1),
      status: position.isActive ? 'ACTIVE' : 'SOLD',
    };
  });
}

function countRoles(positions: ReplayPosition[]) {
  return positions.filter(position => position.status === 'ACTIVE').reduce(
    (counts, position) => ({ ...counts, [position.role]: counts[position.role] + 1 }),
    { P: 0, D: 0, C: 0, A: 0 } as Record<FavcRole, number>,
  );
}

function snapshotAt(team: LoadedDemoTeam, round: number) {
  return team.replay.find(point => point.round === round)
    ?? team.replay.filter(point => point.round <= round).at(-1)
    ?? team.replay[0]
    ?? null;
}

function replayToTrend(replay: TeamRoundSnapshot[], round: number, range: '5' | '10' | 'all'): TeamTrendPoint[] {
  const visible = replay.filter(point => point.round <= round);
  const ranged = range === 'all' ? visible : visible.slice(-Number(range));
  return ranged.map(point => ({
    round: point.round,
    portfolioValue: point.grossPositionsValue,
    totalValue: point.finalLiquidationValue,
    roiPct: point.roiPct,
    teamVoteAverage: point.teamVoteAverage,
  }));
}

function playerSnapshotToCard(snapshot: PlayerRoundSnapshot, replay: TeamRoundSnapshot[]): PlayerCardData {
  const historicalTrend = replay
    .map(point => {
      const player = point.playerSnapshots.find(item => item.playerId === snapshot.playerId);
      return player ? {
        round: point.round,
        quote: player.quote,
        quoteChange: player.quoteChange,
        fantaTradingReturnPct: player.roiPct,
        estimatedValue: player.estimatedValue,
        vote: player.vote,
        fantasyVote: player.fantasyVote,
        played: player.played,
        isSv: player.isSv,
        fantasyBonusPct: player.fantasyBonusPct,
        source: player.sourceQuote,
        sourceVote: player.sourceVote,
      } : null;
    })
    .filter(Boolean) as PlayerCardData['trend'];
  const initialQuote = historicalTrend[0]?.quote ?? snapshot.quote;
  return {
    id: snapshot.playerId,
    playerName: snapshot.name,
    realTeam: snapshot.club,
    role: snapshot.role as FavcRole,
    initialQuote,
    currentQuote: snapshot.quote,
    fantasyMultiplier: 1,
    status: 'ACTIVE',
    trend: historicalTrend.length > 0 ? historicalTrend : snapshot.trend,
  };
}

function buildLocalRosterReplay(
  roster: LocalRoster,
  roundMemory: Map<string, PlayerRoundMemory>,
  maxRound: number,
): TeamRoundSnapshot[] {
  return Array.from({ length: maxRound }, (_, idx) => {
    const round = idx + 1;
    const { positions: positionStates, financials } = buildLocalRosterStateAtRound(roster, round);
    const replayPositions: ReplayPosition[] = positionStates.map(p => ({
      id: p.playerId,
      playerId: p.playerId,
      backendPlayerId: p.backendPlayerId,
      playerName: p.playerName,
      realTeam: p.realTeam,
      role: p.role,
      initialQuote: p.initialQuote,
      currentQuote: p.initialQuote,
      fantasyMultiplier: 1,
      status: p.status,
    }));
    const snapshot = buildTeamRoundSnapshot({
      teamId: roster.id,
      seasonId: roster.seasonId ?? '',
      virtualCashBalance: financials.cashBalance,
      totalCapitalDeposited: financials.totalCapitalDeposited,
    }, replayPositions, roundMemory, round);

    const netLiquidationValue = Number((snapshot.grossPositionsValue * (1 - SELL_COMMISSION_RATE)).toFixed(2));
    const finalLiquidationValue = Number((netLiquidationValue + financials.cashBalance).toFixed(2));
    const profitLoss = Number((finalLiquidationValue - financials.totalCapitalDeposited).toFixed(2));
    const roiPct = financials.totalCapitalDeposited > 0
      ? Number(((profitLoss / financials.totalCapitalDeposited) * 100).toFixed(2))
      : 0;
    const capitalAddedAtRound = round === 1
      ? roster.capitalAddedAtCreation
      : roster.trades.filter(trade => trade.round === round).reduce((sum, trade) => sum + trade.capitalAdded, 0);

    return {
      ...snapshot,
      capitalAdded: capitalAddedAtRound,
      totalSpentPlayers: financials.totalSpentPlayers,
      buyCommissions: financials.totalBuyCommissions,
      sellCommissions: financials.totalSellCommissions,
      virtualCashBalance: financials.cashBalance,
      totalCapitalDeposited: financials.totalCapitalDeposited,
      netLiquidationValue,
      finalLiquidationValue,
      profitLoss,
      roiPct,
    };
  });
}

function buildLocalLoadedTeam(
  roster: LocalRoster,
  syntheticRows: RawSyntheticRoundQuote[],
  voteRows: RawVoteRow[],
  votesMaxRound: number,
  seasonLabel: string,
): LoadedDemoTeam {
  const maxRound = Math.min(TARGET_MAX_ROUND, votesMaxRound || TARGET_MAX_ROUND);
  const memoryInputs = roster.initialPlayers.map(player => ({
    playerId: player.playerId,
    backendPlayerId: player.backendPlayerId,
    externalId: player.playerId,
    playerName: player.playerName,
    role: player.role,
    club: player.realTeam,
    season: seasonLabel,
    initialQuote: player.initialQuote,
    currentQuote: player.initialQuote,
    fantasyMultiplier: 1,
  }));
  // also include players acquired via BUY trades so their memory is built
  for (const trade of roster.trades) {
    if (trade.type === 'BUY' && !memoryInputs.some(item => item.playerId === trade.playerId)) {
      memoryInputs.push({
        playerId: trade.playerId,
        backendPlayerId: trade.backendPlayerId,
        externalId: trade.playerId,
        playerName: trade.playerName,
        role: trade.role,
        club: trade.realTeam,
        season: seasonLabel,
        initialQuote: trade.quoteAtTrade,
        currentQuote: trade.quoteAtTrade,
        fantasyMultiplier: 1,
      });
    }
  }
  const roundMemory = buildPlayerRoundMemory(memoryInputs, voteRows, syntheticRows, {
    season: seasonLabel,
    maxRound,
  });
  const positions: ReplayPosition[] = roster.initialPlayers.map(player => ({
    id: player.playerId,
    playerId: player.playerId,
    backendPlayerId: player.backendPlayerId,
    playerName: player.playerName,
    realTeam: player.realTeam,
    role: player.role,
    initialQuote: player.initialQuote,
    currentQuote: player.initialQuote,
    fantasyMultiplier: 1,
    status: 'ACTIVE',
  }));
  const replay = buildLocalRosterReplay(roster, roundMemory, maxRound);
  const quoteSource = Array.from(roundMemory.values()).some(memory => memory.rounds.some(point => point.sourceQuote === 'synthetic'))
    ? 'synthetic'
    : 'mock';

  return {
    key: `local-${roster.id}`,
    label: roster.name,
    shortLabel: roster.name,
    email: '',
    description: `Rosa locale${roster.backendTeamId ? ' + backend' : ''}`,
    kind: 'active',
    teamId: roster.backendTeamId ?? roster.id,
    positions,
    roundMemory,
    replay,
    maxRound,
    quoteSource,
    voteMaxRound: maxRound,
    roster,
  };
}

export default function SeasonSimulationPanel({ seasonId, seasonLabel = '2025/26', marketPlayers = [] }: Props) {
  const [teams, setTeams] = useState<LoadedDemoTeam[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>(ACTIVE_TEAM_KEY);
  const [roundByTeam, setRoundByTeam] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [message, setMessage] = useState('Carico replay storico 2025/26...');
  const [graphRange, setGraphRange] = useState<'5' | '10' | 'all'>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCardData | null>(null);
  const [justCreatedBanner, setJustCreatedBanner] = useState<{ name: string; rosterId: string; backendTeamId?: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const rosterId = window.sessionStorage.getItem('fantatrading.justCreatedLocalRosterId');
      const name = window.sessionStorage.getItem('fantatrading.justCreatedRosterName');
      const backendTeamId = window.sessionStorage.getItem('fantatrading.justCreatedTeamId');
      if (rosterId) {
        window.sessionStorage.removeItem('fantatrading.justCreatedLocalRosterId');
        window.sessionStorage.removeItem('fantatrading.justCreatedRosterName');
        window.sessionStorage.removeItem('fantatrading.justCreatedTeamId');
        window.sessionStorage.removeItem('fantatrading.justCreatedAt');
        return { rosterId, name: name ?? 'Rosa salvata', backendTeamId: backendTeamId ?? undefined };
      }
    } catch {
      // sessionStorage not available
    }
    return null;
  });

  useEffect(() => {
    const stored = readReplayState(typeof window === 'undefined' ? undefined : window.localStorage, STORAGE_KEY);
    if (stored?.selectedTeam) {
      setSelectedKey(stored.selectedTeam);
    }
    if (stored?.currentRoundByTeam) {
      setRoundByTeam(stored.currentRoundByTeam);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadTeams() {
      setStatus('loading');
      setMessage('Carico rose locali, voti reali e memoria round-by-round...');

      const syntheticRows = await loadSyntheticQuoteRows().catch(() => [] as RawSyntheticRoundQuote[]);
      let sharedPlayers: BackendPlayer[] = [];
      let sharedVotes: BackendVote[] = [];
      const loaded: LoadedDemoTeam[] = [];
      const activeFromStorage = readActiveSimulationTeam(typeof window === 'undefined' ? undefined : window.localStorage);
      const query = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
      let activeTeamId: string | null = query.get('teamId') ?? activeFromStorage?.teamId ?? null;

      // Always try to load votes (best effort) so local rosters can use real votes + fascia.
      const replaySeasonId = seasonId;
      if (replaySeasonId) {
        try {
          const votesResult = await createFantaTradingApi().getVotes({ seasonId: replaySeasonId });
          if (votesResult.ok) sharedVotes = votesResult.data;
        } catch {
          // best-effort
        }
      }
      const sharedVoteRows = votesToRows(sharedVotes);
      const votesMaxRound = Math.max(0, ...sharedVotes.map(vote => Number(vote.round)).filter(Number.isFinite));

      // Load local rosters first - they are the primary view.
      const localRostersList = readLocalRosters();
      for (const roster of localRostersList) {
        const localTeam = buildLocalLoadedTeam(roster, syntheticRows, sharedVoteRows, votesMaxRound, seasonLabel);
        loaded.push(localTeam);
      }

      if (!replaySeasonId) {
        // No backend season available - local rosters are sufficient.
        if (!mounted) return;
        const stored = readReplayState(typeof window === 'undefined' ? undefined : window.localStorage, STORAGE_KEY);
        setTeams(loaded);
        setRoundByTeam(current => Object.fromEntries(loaded.map(team => [
          team.key,
          clampRound(current[team.key] ?? stored?.currentRoundByTeam?.[team.key] ?? team.roster?.currentRound ?? 1, team.maxRound),
        ])));
        if (loaded.length === 0) {
          setStatus('empty');
          setMessage('Nessuna rosa locale salvata e nessun backend disponibile. Crea una rosa per iniziare.');
          return;
        }
        const activeLocalId = getActiveLocalRosterId();
        const firstLocal = loaded.find(team => team.roster?.id === activeLocalId) ?? loaded.find(team => team.kind === 'active');
        if (firstLocal) setSelectedKey(firstLocal.key);
        setStatus('ready');
        setMessage(`Replay locale pronto: ${loaded.length} rosa/e salvate. Quote sintetiche${sharedVoteRows.length > 0 ? ' + voti reali' : ''}.`);
        return;
      }

      // Only fall back to backend "single team" if no local rosters are saved.
      if (!activeTeamId && localRostersList.length === 0) {
        const fallbackTeams = await createFantaTradingApi().getMyTeams();
        if (fallbackTeams.ok) {
          const candidate = fallbackTeams.data.find(team => team.seasonId === replaySeasonId) ?? fallbackTeams.data[0];
          if (candidate) {
            activeTeamId = candidate.id;
            setActiveSimulationTeam(typeof window === 'undefined' ? undefined : window.localStorage, candidate.id, candidate.seasonId, activeFromStorage?.round ?? 1);
          }
        }
      }

      // Skip backend single-team loading if a local roster already mirrors it.
      const localBackendIds = new Set(localRostersList.map(roster => roster.backendTeamId).filter(Boolean) as string[]);
      if (activeTeamId && localBackendIds.has(activeTeamId)) {
        activeTeamId = null;
      }

      const seasonIdNonNull = replaySeasonId as string;

      async function buildLoadedTeam(config: DemoTeamConfig, api: FantaTradingApi, teamId: string) {
        if (sharedPlayers.length === 0) {
          const [playersResult, votesResult] = await Promise.all([
            api.getPlayers({ seasonId: seasonIdNonNull }),
            api.getVotes({ seasonId: seasonIdNonNull }),
          ]);
          sharedPlayers = playersResult.ok ? playersResult.data : [];
          sharedVotes = votesResult.ok ? votesResult.data : [];
        }

        const portfolioResult = await api.getTeamPortfolio(teamId);
        if (!portfolioResult.ok) return null;

        const positions = normalizePositions(portfolioResult.data, sharedPlayers);
        const votesMaxRound = Math.max(0, ...sharedVotes.map(vote => Number(vote.round)).filter(Number.isFinite));
        const maxRound = Math.min(TARGET_MAX_ROUND, votesMaxRound || TARGET_MAX_ROUND);
        const totalCapitalDeposited = Number(portfolioResult.data.summary.totalCapitalDeposited ?? portfolioResult.data.team.initialBudget ?? 0);
        const virtualCashBalance = Number(portfolioResult.data.summary.virtualCashBalance ?? portfolioResult.data.team.availableBudget ?? 0);
        const memoryInputs = positions.map(position => ({
          playerId: position.playerId ?? position.id,
          backendPlayerId: position.backendPlayerId,
          externalId: position.playerId,
          playerName: position.playerName,
          role: position.role,
          club: position.realTeam,
          season: seasonLabel,
          initialQuote: position.initialQuote,
          currentQuote: position.currentQuote,
          fantasyMultiplier: position.fantasyMultiplier,
        }));
        const roundMemory = buildPlayerRoundMemory(memoryInputs, votesToRows(sharedVotes), syntheticRows, {
          season: seasonLabel,
          maxRound,
        });
        const replay = buildTeamReplay({
          teamId,
          seasonId: seasonIdNonNull,
          virtualCashBalance,
          totalCapitalDeposited,
        }, positions, roundMemory, maxRound);
        const quoteSource = Array.from(roundMemory.values()).some(memory => memory.rounds.some(point => point.sourceQuote === 'synthetic'))
          ? 'synthetic'
          : 'mock';

        return {
          ...config,
          teamId,
          positions,
          roundMemory,
          replay,
          maxRound,
          quoteSource,
          voteMaxRound: maxRound,
        } as LoadedDemoTeam;
      }

      if (activeTeamId) {
        const activeTeam = await buildLoadedTeam({
          key: ACTIVE_TEAM_KEY,
          label: 'La mia rosa attiva',
          shortLabel: 'La mia rosa',
          email: '',
          description: 'Squadra salvata dalla creazione rosa',
          kind: 'active',
        }, createFantaTradingApi(), activeTeamId);
        if (activeTeam) {
          loaded.push(activeTeam);
          setActiveSimulationTeam(typeof window === 'undefined' ? undefined : window.localStorage, activeTeam.teamId, replaySeasonId, activeFromStorage?.round ?? 1);
        }
      }

      for (const config of DEMO_TEAMS) {
        const token = await getDemoAccessTokenForEmail(config.email);
        if (!token) continue;

        const api = new FantaTradingApi({ token });
        const teamsResult = await api.getMyTeams();
        if (!teamsResult.ok) continue;
        const team = teamsResult.data.find(item => item.seasonId === replaySeasonId);
        if (!team) continue;
        const demoTeam = await buildLoadedTeam({ ...config, kind: 'demo' }, api, team.id);
        if (demoTeam) loaded.push(demoTeam);
      }

      if (!mounted) return;
      const stored = readReplayState(typeof window === 'undefined' ? undefined : window.localStorage, STORAGE_KEY);
      setTeams(loaded);
      setRoundByTeam(current => Object.fromEntries(loaded.map(team => [
        team.key,
        clampRound(current[team.key] ?? stored?.currentRoundByTeam?.[team.key] ?? activeFromStorage?.round ?? 1, team.maxRound),
      ])));
      if (loaded.length === 0) {
        setStatus('empty');
        setMessage('Nessuna squadra demo multi trovata. Esegui npm.cmd run backend:seed:demo:2025-26:multi.');
        return;
      }

      setStatus('ready');
      const activeLocalId = getActiveLocalRosterId();
      const queryRosterId = query.get('rosterId');
      const preferredKey = queryRosterId
        ? loaded.find(team => team.roster?.id === queryRosterId)?.key
        : activeLocalId
          ? loaded.find(team => team.roster?.id === activeLocalId)?.key
          : loaded.find(team => team.key === ACTIVE_TEAM_KEY)?.key;
      if (preferredKey) {
        setSelectedKey(preferredKey);
      } else {
        const firstActive = loaded.find(team => team.kind === 'active');
        if (firstActive) setSelectedKey(firstActive.key);
      }
      const localCount = loaded.filter(team => team.roster).length;
      setMessage(`Replay 2025/26 pronto: ${localCount} rosa/e locali${localCount ? ' + ' : ''}${loaded.filter(t => t.kind === 'demo').length} demo. Voti reali fino a G${loaded[0]?.voteMaxRound ?? '?'}, quote sintetiche dove non c'e' QuoteHistory ufficiale.`);
    }

    loadTeams().catch((error) => {
      if (!mounted) return;
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Errore nel caricamento del replay storico.');
    });

    return () => {
      mounted = false;
    };
  }, [seasonId, seasonLabel]);

  useEffect(() => {
    writeReplayState(typeof window === 'undefined' ? undefined : window.localStorage, STORAGE_KEY, {
      selectedTeam: selectedKey,
      teamIdByKey: Object.fromEntries(teams.map(team => [team.key, team.teamId])),
      currentRoundByTeam: roundByTeam,
    });
  }, [roundByTeam, selectedKey, teams]);

  const activeTeams = useMemo(() => teams.filter(team => team.kind === 'active'), [teams]);
  const selectedTeam = useMemo(() =>
    activeTeams.find(team => team.key === selectedKey) ?? activeTeams[0] ?? null,
  [activeTeams, selectedKey]);
  const maxRound = selectedTeam?.maxRound ?? TARGET_MAX_ROUND;
  const selectedRound = selectedTeam ? clampRound(roundByTeam[selectedTeam.key] ?? 1, selectedTeam.maxRound) : 1;
  const selectedSnapshot = selectedTeam ? snapshotAt(selectedTeam, selectedRound) : null;
  const selectedRoster = selectedTeam?.roster ?? null;
  const demoTeams = teams.filter(team => team.kind !== 'active');
  const hasDemoComparison = demoTeams.length > 0;
  const ranking = useMemo(() => rankTeamsByRoi(
    demoTeams
      .map(team => ({ team, snapshot: snapshotAt(team, roundByTeam[team.key] ?? 1) }))
      .filter((item): item is { team: LoadedDemoTeam; snapshot: TeamRoundSnapshot } => Boolean(item.snapshot)),
  ), [roundByTeam, demoTeams]);
  const selectedTrend = selectedTeam ? replayToTrend(selectedTeam.replay, selectedRound, graphRange) : [];
  const selectedCounts = selectedTeam ? countRoles(selectedTeam.positions) : { P: 0, D: 0, C: 0, A: 0 };
  const quoteSynthetic = selectedTeam?.quoteSource === 'synthetic';

  function handleRosterUpdated(nextRoster: LocalRoster) {
    upsertLocalRoster(nextRoster);
    setActiveLocalRosterId(nextRoster.id);
    setTeams(current => current.map(team => {
      if (team.roster?.id !== nextRoster.id) return team;
      const replay = buildLocalRosterReplay(nextRoster, team.roundMemory, team.maxRound);
      return { ...team, roster: nextRoster, replay };
    }));
  }

  function handleRosterDelete(rosterId: string) {
    if (!window.confirm('Eliminare definitivamente questa rosa locale?')) return;
    deleteLocalRoster(rosterId);
    setTeams(current => current.filter(team => team.roster?.id !== rosterId));
  }

  function updateSelectedRound(nextRound: number) {
    if (!selectedTeam) return;
    const clamped = clampRound(nextRound, selectedTeam.maxRound);
    setRoundByTeam(current => ({
      ...current,
      [selectedTeam.key]: clamped,
    }));
    if (selectedTeam.roster) {
      upsertLocalRoster({ ...selectedTeam.roster, currentRound: clamped });
    }
    if (selectedTeam.key === ACTIVE_TEAM_KEY || selectedTeam.roster?.backendTeamId) {
      setActiveSimulationTeam(typeof window === 'undefined' ? undefined : window.localStorage, selectedTeam.teamId, seasonId ?? '', clamped);
    }
  }

  function advanceSelected() {
    if (!selectedTeam) return;
    updateSelectedRound(advanceRound(selectedRound, selectedTeam.maxRound));
  }

  function previousSelected() {
    updateSelectedRound(previousRound(selectedRound));
  }

  function advanceAll() {
    setRoundByTeam(current => Object.fromEntries(
      teams.map(team => [team.key, advanceRound(current[team.key] ?? 1, team.maxRound)]),
    ));
  }

  function resetRounds() {
    setRoundByTeam(Object.fromEntries(teams.map(team => [team.key, resetRound()])));
  }

  return (
    <>
      {justCreatedBanner && (
        <div className="backend-banner trade-status trade-status-success" role="status">
          <strong>Rosa &quot;{justCreatedBanner.name}&quot; salvata correttamente</strong>
          <span>
            La simulazione 2025/26 parte da G1 con la tua nuova rosa. Salvata localmente come <code>fantatrading.localRosters.v1</code>{justCreatedBanner.backendTeamId ? ' + backend' : ' (solo locale)'}.
            <button type="button" className="favc-action muted" onClick={() => setJustCreatedBanner(null)} style={{ marginLeft: 12 }}>OK</button>
          </span>
        </div>
      )}

      <Section title="Simulazione storica 2025/26">
        <div className="backend-banner trade-status trade-status-info">
          <strong>{status === 'ready' && selectedTeam ? `Giornata corrente G${selectedRound} di G${maxRound}` : 'Stato replay'}</strong>
          <span>{message}</span>
        </div>

        <div className="simulation-toolbar">
          <StatusBadges items={[
            'Voti reali fino a G36',
            quoteSynthetic ? 'Quote sintetiche pilot' : 'Quote official/mock',
            'Capitale virtuale',
            'Ranking ROI%',
            'Nessun payout reale',
          ]} />
          {activeTeams.length > 1 && (
            <div className="roster-switcher">
              <span className="roster-switcher-eyebrow">I miei team locali</span>
              <div className="roster-switcher-list">
                {activeTeams.map(team => {
                  const teamRound = clampRound(roundByTeam[team.key] ?? team.roster?.currentRound ?? 1, team.maxRound);
                  const snapshotPreview = snapshotAt(team, teamRound);
                  const roi = snapshotPreview?.roiPct ?? 0;
                  return (
                    <button
                      type="button"
                      key={team.key}
                      className={`roster-chip ${team.key === selectedTeam?.key ? 'roster-chip-active' : ''}`}
                      onClick={() => setSelectedKey(team.key)}
                    >
                      <strong>{team.label}</strong>
                      <span>G{teamRound}/G{team.maxRound}</span>
                      <small className={roi >= 0 ? 'positive' : 'negative'}>{formatSignedPercent(roi, 1)}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="simulation-controls replay-controls">
            <button type="button" className="favc-action favc-action-primary" onClick={advanceSelected} disabled={!selectedTeam || selectedRound >= maxRound}>
              {selectedTeam ? `Avanza a G${Math.min(selectedRound + 1, maxRound)}` : 'Avanza giornata'}
            </button>
            <button type="button" className="favc-action" onClick={previousSelected} disabled={!selectedTeam || selectedRound <= 1}>
              Giornata precedente
            </button>
            <button type="button" className="favc-action muted" onClick={() => updateSelectedRound(1)} disabled={!selectedTeam || selectedRound === 1}>
              Reset G1
            </button>
            <button type="button" className="favc-action muted" onClick={() => updateSelectedRound(maxRound)} disabled={!selectedTeam || selectedRound >= maxRound}>
              Vai a G{maxRound}
            </button>
            {hasDemoComparison && (
              <button type="button" className="favc-action muted" onClick={advanceAll} disabled={teams.length === 0}>
                Avanza demo confronto
              </button>
            )}
            <Link className="favc-action muted" to="/partecipante-favc/crea-squadra">Modifica rosa</Link>
            <label className="round-slider-label">
              Vai a giornata <strong>G{selectedRound}</strong>
              <input
                type="range"
                min="1"
                max={maxRound}
                value={selectedRound}
                onChange={event => updateSelectedRound(Number(event.target.value))}
                disabled={!selectedTeam}
              />
            </label>
          </div>
          <div className="table-note">
            La simulazione e visuale: usa quote stimate e voti reali 2025/26, non modifica database, MarketOperation, cash o roster reali.
          </div>
        </div>

        {status !== 'ready' && (
          <EmptyState
            title="Replay storico non pronto"
            text="Il replay 2025/26 richiede backend acceso e dati 2025/26 caricati."
          />
        )}
        {status === 'ready' && activeTeams.length === 0 && (
          <div className="sim-empty-cta card">
            <div>
              <span className="badge badge-amber">Squadra attiva mancante</span>
              <h3>Crea o seleziona prima una rosa</h3>
              <p>La simulazione storica 2025/26 lavora sulla tua rosa salvata. Costruisci 25 giocatori (3 P, 8 D, 8 C, 6 A) e torna qui per vedere giornata per giornata valore rosa, budget residuo, voti, fascia e bonus/malus.</p>
            </div>
            <Link className="button button-primary" to="/partecipante-favc/crea-squadra">Vai a Crea squadra</Link>
          </div>
        )}
      </Section>

      {selectedTeam && selectedSnapshot && (
        <>
          <Section title="La mia simulazione">
            <div className="sim-info-card card">
              <div className="sim-info-headline">
                <div>
                  <span className="sim-info-eyebrow">Squadra attiva</span>
                  <h3>{selectedTeam.label}</h3>
                  <p>Stagione {seasonLabel} - giornata <strong>G{selectedRound}</strong> di G{selectedTeam.maxRound}</p>
                </div>
                <div className="sim-info-round">
                  <span className="sim-info-eyebrow">Giornata corrente</span>
                  <strong>G{selectedRound}<small>/G{selectedTeam.maxRound}</small></strong>
                </div>
              </div>
              <div className="sim-info-grid">
                <div><span>Giocatori caricati</span><strong>{selectedTeam.positions.filter(player => player.status === 'ACTIVE').length}/25</strong></div>
                <div><span>Composizione</span><strong>{selectedCounts.P}/3 P · {selectedCounts.D}/8 D · {selectedCounts.C}/8 C · {selectedCounts.A}/6 A</strong></div>
                <div><span>Team ID</span><strong title={selectedTeam.teamId}><code>{selectedTeam.teamId.slice(0, 8)}...</code></strong></div>
                <div><span>Season ID</span><strong title={seasonId ?? '-'}><code>{(seasonId ?? '').slice(0, 8) || '-'}...</code></strong></div>
                <div><span>Quote source</span><strong>{selectedTeam.quoteSource === 'synthetic' ? 'Sintetiche pilot' : selectedTeam.quoteSource === 'official' ? 'Ufficiali' : 'Mock fallback'}</strong></div>
                <div><span>Voti source</span><strong>{selectedTeam.voteMaxRound > 0 ? `Reali fino a G${selectedTeam.voteMaxRound}` : 'Mancanti'}</strong></div>
              </div>
            </div>
          </Section>

          <div className="kpi-primary-grid">
            <MetricCard label="Capitale iniziale" value={formatCredits(selectedSnapshot.totalCapitalDeposited)} sub="virtuale depositato" color="var(--teal)" />
            <MetricCard label="Speso giocatori" value={formatCredits(selectedSnapshot.totalSpentPlayers)} sub="totale quote rosa" color="var(--accent)" />
            <MetricCard label="Commissioni pagate" value={formatCredits(selectedSnapshot.buyCommissions + selectedSnapshot.sellCommissions)} sub="2% acquisto + 1.25% vendita" color="var(--amber)" />
            <MetricCard label="Budget/Cash residuo" value={formatCredits(selectedSnapshot.virtualCashBalance)} sub="cash virtuale disponibile" color="var(--green)" />
            <MetricCard label="Valore rosa" value={formatCredits(selectedSnapshot.grossPositionsValue)} sub="gross positions stimate" color="var(--accent)" />
            <MetricCard label="Guadagno / Perdita" value={formatSignedCredits(selectedSnapshot.profitLoss)} sub="progressivo stimato" color={selectedSnapshot.profitLoss >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricCard label="Guadagno % / ROI" value={formatSignedPercent(selectedSnapshot.roiPct)} sub="classifica principale" color={selectedSnapshot.roiPct >= 0 ? 'var(--green)' : 'var(--red)'} />
          </div>

          <div className="kpi-secondary-grid">
            <MetricCard label="Media voto squadra" value={selectedSnapshot.teamVoteAverage === null ? 'n.d.' : selectedSnapshot.teamVoteAverage.toFixed(2)} sub={selectedSnapshot.teamBandLabel.replace('_', ' ')} color="var(--purple)" />
            <MetricCard label="Con voto / SV" value={`${selectedSnapshot.playersWithVote} / ${selectedSnapshot.svCount}`} sub="SV escluso dalla media" color="var(--amber)" />
            <MetricCard label="Miglior giocatore" value={selectedSnapshot.bestPlayer?.name ?? 'n.d.'} sub={selectedSnapshot.bestPlayer ? formatSignedPercent(selectedSnapshot.bestPlayer.roiPct) : undefined} color="var(--green)" />
            <MetricCard label="Peggior giocatore" value={selectedSnapshot.worstPlayer?.name ?? 'n.d.'} sub={selectedSnapshot.worstPlayer ? formatSignedPercent(selectedSnapshot.worstPlayer.roiPct) : undefined} color="var(--red)" />
          </div>

          {selectedRoster && (
            <Section title={`Operazioni libere G${selectedRound}`}>
              <LocalRosterTradePanel
                roster={selectedRoster}
                round={selectedRound}
                marketPlayers={marketPlayers}
                roundMemory={selectedTeam.roundMemory}
                onUpdated={handleRosterUpdated}
              />
              <div className="trade-round-controls">
                <button type="button" className="favc-action muted" onClick={() => handleRosterDelete(selectedRoster.id)}>Elimina questa rosa locale</button>
              </div>
            </Section>
          )}

          {selectedSnapshot.playersWithVote === 0 && selectedSnapshot.playerSnapshots.every(player => player.quoteChange === 0) && (
            <div className="backend-banner backend-no-team">
              <strong>Nessun dato disponibile per questa giornata</strong>
              <span>Non risultano voti validi ne variazioni quota per la rosa attiva in questo round.</span>
            </div>
          )}

          <Section title="Log giornata">
            <div className="notice-card replay-log">
              <strong>{buildRoundLog(selectedSnapshot)}</strong>
              <p>Gli SV sono esclusi dalla media squadra e hanno effetto individuale 0%.</p>
            </div>
          </Section>

          <div className="trend-range-toggle standalone-toggle">
            <button type="button" className={graphRange === '5' ? 'active' : ''} onClick={() => setGraphRange('5')}>Ultime 5</button>
            <button type="button" className={graphRange === '10' ? 'active' : ''} onClick={() => setGraphRange('10')}>Ultime 10</button>
            <button type="button" className={graphRange === 'all' ? 'active' : ''} onClick={() => setGraphRange('all')}>Tutte</button>
          </div>

          <div className="favc-dashboard-grid replay-chart-grid">
            <Section title="Andamento valore rosa">
              <div className="card chart-card">
                <TeamTrendChart data={selectedTrend} valueKey="portfolioValue" />
              </div>
            </Section>
            <Section title="Andamento ROI%">
              <div className="card chart-card">
                <TeamTrendChart data={selectedTrend} valueKey="roiPct" />
              </div>
            </Section>
            <Section title="Andamento media squadra">
              <div className="card chart-card">
                <TeamTrendChart data={selectedTrend} valueKey="teamVoteAverage" />
              </div>
            </Section>
          </div>

          <Section title="Andamento economico giornata per giornata">
            <div className="card table-scroll">
              <table className="compact-table economic-progress-table">
                <thead>
                  <tr>
                    <th>Giornata</th>
                    <th>Capitale iniziale</th>
                    <th>Capitale aggiunto</th>
                    <th>Totale speso giocatori</th>
                    <th>Commissioni acquisto</th>
                    <th>Commissioni vendita</th>
                    <th>Budget/Cash residuo</th>
                    <th>Valore rosa lordo</th>
                    <th>Valore rosa netto</th>
                    <th>Utile/Perdita</th>
                    <th>Guadagno %</th>
                    <th>Media voto</th>
                    <th>Fascia</th>
                    <th>Bonus/Malus squadra</th>
                    <th>Con voto</th>
                    <th>SV</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTeam.replay.filter(point => point.round <= selectedRound).map(point => (
                    <tr key={point.round} className={point.round === selectedRound ? 'selected-row' : ''}>
                      <td>G{point.round}</td>
                      <td>{formatCredits(point.totalCapitalDeposited)}</td>
                      <td>{formatCredits(point.capitalAdded)}</td>
                      <td>{formatCredits(point.totalSpentPlayers)}</td>
                      <td>{formatCredits(point.buyCommissions)}</td>
                      <td>{formatCredits(point.sellCommissions)}</td>
                      <td>{formatCredits(point.virtualCashBalance)}</td>
                      <td>{formatCredits(point.grossPositionsValue)}</td>
                      <td>{formatCredits(point.netLiquidationValue)}</td>
                      <td className={valueTone(point.profitLoss)}>{formatSignedCredits(point.profitLoss)}</td>
                      <td className={valueTone(point.roiPct)}>{formatSignedPercent(point.roiPct)}</td>
                      <td>{point.teamVoteAverage ?? 'n.d.'}</td>
                      <td>{point.teamBandLabel.replace('_', ' ')}</td>
                      <td className={valueTone(point.teamBandBonusMalusPct)}>{formatSignedPercent(point.teamBandBonusMalusPct)}</td>
                      <td>{point.playersWithVote}</td>
                      <td>{point.svCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="favc-dashboard-grid">
            {hasDemoComparison && (
              <Section title="Confronto demo multi-squadra (secondario)">
                <div className="card table-scroll">
                  <div className="table-note" style={{ marginBottom: 10 }}>
                    Le squadre demo VALUE / LOW COST / TOP PLAYER / BALANCED sono solo riferimento di confronto. La tua rosa resta la simulazione principale qui sopra.
                  </div>
                  <table className="compact-table">
                    <thead><tr><th>#</th><th>Team</th><th>Giornata</th><th>Valore rosa</th><th>P/L</th><th>ROI%</th><th>Media</th><th>SV</th></tr></thead>
                    <tbody>
                      {ranking.map((item, index) => (
                        <tr key={item.team.key}>
                          <td>{index + 1}</td>
                          <td><strong>{item.team.shortLabel}</strong><span className="table-subline">{item.team.description}</span></td>
                          <td>G{item.snapshot.round}</td>
                          <td>{formatCredits(item.snapshot.grossPositionsValue)}</td>
                          <td className={valueTone(item.snapshot.profitLoss)}>{formatSignedCredits(item.snapshot.profitLoss)}</td>
                          <td className={valueTone(item.snapshot.roiPct)}>{formatSignedPercent(item.snapshot.roiPct)}</td>
                          <td>{item.snapshot.teamVoteAverage ?? 'n.d.'}</td>
                          <td>{item.snapshot.svCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            <Section title="Composizione selezionata">
              <div className="card composition-card">
                {(['P', 'D', 'C', 'A'] as FavcRole[]).map(role => (
                  <div className="builder-progress-item" key={role}>
                    <span>{roleNames[role]}</span>
                    <strong>{selectedCounts[role]}/{roleLimits[role]}</strong>
                    <div className="builder-progress-bar">
                      <span style={{ width: `${Math.min(100, (selectedCounts[role] / roleLimits[role]) * 100)}%` }} />
                    </div>
                  </div>
                ))}
                <div className="table-note">Ranking demo ordinato sempre per ROI%, non per valore assoluto.</div>
              </div>
            </Section>
          </div>

          <FantacalcioLivePanel
            round={selectedRound}
            maxRound={selectedTeam.maxRound}
            snapshot={selectedSnapshot}
            rosterName={selectedTeam.label}
            onSelectPlayer={(player) => setSelectedPlayer(playerSnapshotToCard(player, selectedTeam.replay))}
          />

          <Section title="Andamento giocatori - trend rapido">
            <div className="card table-scroll">
              <table className="portfolio-table compact-table simulation-player-table">
                <thead>
                  <tr>
                    <th>Trend G1-G{selectedRound}</th>
                    <th>Giocatore</th>
                    <th>Ruolo</th>
                    <th>Quota</th>
                    <th>Δ Quota</th>
                    <th>Valore stim.</th>
                    <th>Contributo €</th>
                    <th>ROI %</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSnapshot.playerSnapshots.map(player => {
                    const highlight = selectedSnapshot.topPlayers.some(item => item.playerId === player.playerId)
                      ? 'top-player-row'
                      : selectedSnapshot.bottomPlayers.some(item => item.playerId === player.playerId)
                        ? 'bottom-player-row'
                        : player.isSv ? 'sv-player-row' : '';
                    return (
                    <tr key={player.playerId} className={`clickable-row ${highlight}`} onClick={() => setSelectedPlayer(playerSnapshotToCard(player, selectedTeam.replay))}>
                      <td className="mini-trend-cell wide"><PlayerTrendChart data={player.trend.filter(point => point.round <= selectedRound)} mode="mini" /></td>
                      <td><strong>{player.name}</strong><span className="table-subline">{player.club}</span></td>
                      <td><span className="role-badge">{player.role}</span></td>
                      <td>{formatCredits(player.quote)}</td>
                      <td className={valueTone(player.quoteChange)}>{formatSignedCredits(player.quoteChange)}</td>
                      <td>{formatCredits(player.estimatedValue)}</td>
                      <td className={valueTone(player.profitLoss)}>{formatSignedCredits(player.profitLoss)}</td>
                      <td className={valueTone(player.roiPct)}>{formatSignedPercent(player.roiPct)}</td>
                    </tr>
                  );})}
                </tbody>
              </table>
              <div className="table-note">
                Sparkline G1-G{selectedRound} per ogni giocatore. Click sulla riga per la storia fantacalcistica completa. Source quote: {selectedTeam.quoteSource}.
              </div>
            </div>
          </Section>
        </>
      )}

      <PlayerDetailDrawer player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </>
  );
}
