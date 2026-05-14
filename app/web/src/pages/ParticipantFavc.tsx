import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  createFantaTradingApi,
  getOrCreateDemoAccessToken,
  getStoredAccessToken,
  type ApiMode,
  type BackendFinalSettlement,
  type BackendMarketOperation,
  type BackendPlayer,
  type BackendPortfolio,
  type BackendQuote,
  type BackendSeason,
  type BackendVote,
} from '../api';
import { EmptyState, MetricCard, Section, StatusBadges } from '../components';
import PlayerCard, { type PlayerCardData } from '../components/PlayerCard';
import PlayerDetailDrawer from '../components/PlayerDetailDrawer';
import PlayerTrendChart from '../components/PlayerTrendChart';
import SeasonSimulationPanel from '../components/SeasonSimulationPanel';
import TeamBuilderPanel from '../components/TeamBuilderPanel';
import TeamTrendChart from '../components/TeamTrendChart';
import TradeConfirmModal from '../components/TradeConfirmModal';
import TradeSimulationPanel from '../components/TradeSimulationPanel';
import {
  SELL_COMMISSION_RATE,
  calculatePositionValue,
  demoMarketPlayers,
  demoPositions,
  initialOperations,
  roleLimits,
  roleNames,
  type DemoMarketPlayer,
  type DemoOperation,
  type DemoPosition,
  type FavcRole,
} from '../mock/favcDemoData';
import {
  createMockTrend,
  mergeVotesIntoTrend,
  normalizeSyntheticTrend,
  type PlayerTrendPoint,
  type RawSyntheticRoundQuote,
  type RawVoteRow,
} from '../utils/playerTrend';
import { buildTeamTrendFromPositions } from '../utils/teamTrend';
import {
  filterAndSortMarketPlayers,
  type MarketFilterState,
  type MarketPriceFilter,
  type MarketSortKey,
  type MarketTrendFilter,
} from '../utils/marketFilters';
import { formatCredits, formatSignedCredits, formatSignedPercent, valueTone } from '../utils/format';

type ParticipantTab = 'overview' | 'mercato' | 'rosa' | 'operazioni' | 'settlement' | 'crea-squadra' | 'simulazione-stagione';
type DataSource = 'mock' | 'backend';

type BackendUiState = {
  mode: ApiMode | 'checking';
  message: string;
  teamLabel?: string;
};

type FinancialSnapshot = {
  totalCapitalDeposited?: number;
  virtualCashBalance?: number;
  currentPortfolioValue?: number;
  netLiquidationValue?: number;
  finalLiquidationValue?: number;
  profitLoss?: number;
  roiPct?: number;
  rankByRoi?: number | null;
};

type TradeDialog =
  | { type: 'buy'; player: DemoMarketPlayer }
  | { type: 'sell'; position: DemoPosition };

type TradeStatus = {
  tone: 'success' | 'error' | 'info';
  message: string;
};

const TABS: Array<{ id: ParticipantTab; label: string; path: string }> = [
  { id: 'overview', label: 'Overview', path: '/partecipante-favc/overview' },
  { id: 'mercato', label: 'Mercato', path: '/partecipante-favc/mercato' },
  { id: 'rosa', label: 'La mia rosa', path: '/partecipante-favc/rosa' },
  { id: 'crea-squadra', label: 'Crea squadra', path: '/partecipante-favc/crea-squadra' },
  { id: 'simulazione-stagione', label: 'Simulazione stagione', path: '/partecipante-favc/simulazione-stagione' },
  { id: 'operazioni', label: 'Operazioni', path: '/partecipante-favc/operazioni' },
  { id: 'settlement', label: 'Settlement', path: '/partecipante-favc/settlement' },
];

const TEAM_BUILDER_SEASON = '2025/26';

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
  }));
}

function buildFinancialSnapshot(portfolio: BackendPortfolio, settlement?: BackendFinalSettlement): FinancialSnapshot {
  const summary = portfolio.summary;
  return {
    totalCapitalDeposited: Number(settlement?.totalCapitalDeposited ?? summary.totalCapitalDeposited ?? 0),
    virtualCashBalance: Number(settlement?.virtualCashBalance ?? summary.virtualCashBalance ?? 0),
    currentPortfolioValue: Number(summary.currentPortfolioValue ?? 0),
    netLiquidationValue: Number(settlement?.netLiquidationValue ?? summary.netLiquidationValue ?? 0),
    finalLiquidationValue: Number(settlement?.finalLiquidationValue ?? summary.finalLiquidationValue ?? 0),
    profitLoss: Number(settlement?.profitLoss ?? summary.profitLoss ?? 0),
    roiPct: Number(settlement?.roiPct ?? summary.roiPct ?? summary.currentRoi ?? 0),
    rankByRoi: settlement?.rankByRoi ?? null,
  };
}

function normalizePortfolioPositions(
  portfolio: BackendPortfolio,
  players: BackendPlayer[],
  syntheticRows: RawSyntheticRoundQuote[],
  voteRows: RawVoteRow[],
) {
  return portfolio.positions.map<DemoPosition>(position => {
    const player = players.find(item => item.id === position.playerId);
    const playerName = position.playerName || (player ? backendPlayerName(player) : position.playerId);
    const initialQuote = Number(position.initialQuote || position.buyPrice || position.currentQuote || 1);
    const currentQuote = Number(position.currentQuote || initialQuote);
    const fantasyMultiplier = Number(position.fantasyMultiplier || 1);

    return {
      id: position.id,
      playerId: player?.externalId ?? position.playerId,
      playerName,
      realTeam: player?.realTeam ?? 'Backend',
      role: mapBackendRole(position.role),
      initialQuote,
      currentQuote,
      fantasyMultiplier,
      status: position.isActive ? 'ACTIVE' : 'SOLD',
      trend: mergeVotesIntoTrend(
        normalizeSyntheticTrend(syntheticRows, player?.externalId ?? position.playerId, {
          initialQuote,
          currentQuote,
          fantasyMultiplier,
          playerName,
        }),
        voteRows,
        position.playerId,
      ),
    };
  });
}

function normalizeMarketPlayers(
  players: BackendPlayer[],
  quotes: BackendQuote[],
  currentPositions: DemoPosition[],
  syntheticRows: RawSyntheticRoundQuote[],
  voteRows: RawVoteRow[],
  limit = 80,
) {
  const ownedIds = new Set(currentPositions.filter(position => position.status === 'ACTIVE').map(position => position.playerId).filter(Boolean));
  return players
    .filter(player => !ownedIds.has(player.externalId ?? player.id))
    .slice(0, limit)
    .map<DemoMarketPlayer>(player => {
      const quote = quotes.find(item => item.playerId === player.id) ?? player.quotes?.[0];
      const initialQuote = Number(quote?.initialQuote ?? 6);
      const currentQuote = Number(quote?.currentQuote ?? initialQuote);
      const trendPct = (currentQuote - initialQuote) * 5;
      const playerName = backendPlayerName(player);

      return {
        id: player.id,
        playerId: player.externalId ?? player.id,
        playerName,
        realTeam: player.realTeam ?? 'Backend',
        role: mapBackendRole(player.role),
        quote: currentQuote,
        trendPct,
        performancePct: trendPct,
        available: true,
        trend: mergeVotesIntoTrend(
          normalizeSyntheticTrend(syntheticRows, player.externalId ?? player.id, {
            initialQuote,
            currentQuote,
            playerName,
          }),
          voteRows,
          player.id,
        ),
      };
    });
}

function backendOperationsToDemo(operations: BackendMarketOperation[]): DemoOperation[] {
  return operations.map((operation, index) => {
    const grossAmount = Number(operation.grossAmount ?? operation.valueAtOperation ?? 0);
    const netAmount = Number(operation.netAmount ?? 0);
    const cashBefore = Number(operation.budgetBefore ?? 0);
    const cashAfter = Number(operation.budgetAfter ?? 0);
    return {
      id: operation.id,
      type: operation.type,
      playerName: operation.player ? backendPlayerName(operation.player) : operation.playerId,
      grossAmount,
      commission: Number(operation.commissionAmount ?? 0),
      netAmount,
      capitalAdded: operation.type === 'BUY' ? Math.max(0, netAmount - cashBefore) : 0,
      cashBefore,
      cashAfter,
      round: operation.executedAt ? new Date(operation.executedAt).toLocaleDateString('it-IT') : `Op ${index + 1}`,
    };
  });
}

function roleCount(positions: DemoPosition[]) {
  return positions
    .filter(position => position.status === 'ACTIVE')
    .reduce(
      (counts, position) => ({ ...counts, [position.role]: counts[position.role] + 1 }),
      { P: 0, D: 0, C: 0, A: 0 } as Record<FavcRole, number>,
    );
}

function getPositionPL(position: DemoPosition) {
  if (position.status === 'SOLD') return 0;
  return calculatePositionValue(position) - position.initialQuote;
}

function getPositionRoi(position: DemoPosition) {
  if (position.initialQuote <= 0 || position.status === 'SOLD') return 0;
  return (getPositionPL(position) / position.initialQuote) * 100;
}

function positionToCard(position: DemoPosition): PlayerCardData {
  return {
    id: position.id,
    playerName: position.playerName,
    realTeam: position.realTeam,
    role: position.role,
    initialQuote: position.initialQuote,
    currentQuote: position.currentQuote,
    fantasyMultiplier: position.fantasyMultiplier,
    status: position.status,
    trend: position.trend ?? createMockTrend(position.initialQuote, position.currentQuote, position.fantasyMultiplier),
  };
}

function marketToCard(player: DemoMarketPlayer): PlayerCardData {
  const initialQuote = player.trend?.[0]?.quote ?? player.quote;
  return {
    id: player.id,
    playerName: player.playerName,
    realTeam: player.realTeam,
    role: player.role,
    initialQuote,
    currentQuote: player.quote,
    fantasyMultiplier: 1,
    trend: player.trend ?? createMockTrend(initialQuote, player.quote),
    actionLabel: 'Compra demo',
    actionDisabled: false,
  };
}

function tabFromPath(pathname: string): ParticipantTab | null {
  const last = pathname.split('/').filter(Boolean).at(-1);
  if (!last || last === 'partecipante-favc') return null;
  return TABS.some(tab => tab.id === last) ? last as ParticipantTab : null;
}

export default function ParticipantFavc() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = tabFromPath(location.pathname);
  const [positions, setPositions] = useState<DemoPosition[]>(() => demoPositions);
  const [marketPlayers, setMarketPlayers] = useState<DemoMarketPlayer[]>(() => demoMarketPlayers);
  const [builderPlayers, setBuilderPlayers] = useState<DemoMarketPlayer[]>(() => demoMarketPlayers);
  const [builderSeason, setBuilderSeason] = useState<BackendSeason | null>(null);
  const [builderExistingTeamId, setBuilderExistingTeamId] = useState<string | null>(null);
  const [builderVotesMaxRound, setBuilderVotesMaxRound] = useState<number | null>(null);
  const [builderTrendSource, setBuilderTrendSource] = useState<'official' | 'synthetic' | 'mock'>('mock');
  const [operations, setOperations] = useState<DemoOperation[]>(() => initialOperations);
  const [virtualCashBalance, setVirtualCashBalance] = useState(0);
  const [financialSnapshot, setFinancialSnapshot] = useState<FinancialSnapshot | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [backendState, setBackendState] = useState<BackendUiState>({
    mode: 'checking',
    message: 'Verifica connessione backend in corso...',
  });
  const [dataSource, setDataSource] = useState<DataSource>('mock');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCardData | null>(null);
  const [simulationNotice, setSimulationNotice] = useState('');
  const [tradeDialog, setTradeDialog] = useState<TradeDialog | null>(null);
  const [tradeSubmitting, setTradeSubmitting] = useState(false);
  const [tradeError, setTradeError] = useState('');
  const [tradeStatus, setTradeStatus] = useState<TradeStatus | null>(null);
  const [marketFilters, setMarketFilters] = useState<MarketFilterState>({
    search: '',
    role: 'all',
    team: 'Tutte',
    price: 'all',
    trend: 'all',
    onlyWithTrend: false,
    sortBy: 'return',
  });

  useEffect(() => {
    let mounted = true;

    async function loadBackendData() {
      const api = createFantaTradingApi();
      const health = await api.health();

      if (!mounted) return;
      if (!health.ok) {
        setBackendState({ mode: 'backend-unavailable', message: 'Backend non disponibile: uso fallback demo/mock locale.' });
        setTeamId(null);
        setSeasonId(null);
        setDataSource('mock');
        return;
      }

      const token = getStoredAccessToken() ?? await getOrCreateDemoAccessToken();
      if (!token) {
        setBackendState({
          mode: 'missing-token',
          message: import.meta.env.DEV
            ? 'Backend raggiungibile, ma login demo non disponibile: esegui il seed demo o imposta un token JWT locale.'
            : 'Backend raggiungibile, ma manca un token JWT locale: uso demo/mock read-only.',
        });
        setTeamId(null);
        setSeasonId(null);
        return;
      }

      let authedApi = createFantaTradingApi();
      let [teams, seasons] = await Promise.all([
        authedApi.getMyTeams(),
        authedApi.getSeasons(),
      ]);
      if (!teams.ok && import.meta.env.DEV && (teams.status === 401 || teams.status === 403)) {
        const refreshedToken = await getOrCreateDemoAccessToken(undefined, { forceRefresh: true });
        if (refreshedToken) {
          authedApi = createFantaTradingApi();
          [teams, seasons] = await Promise.all([
            authedApi.getMyTeams(),
            authedApi.getSeasons(),
          ]);
        }
      }
      if (!mounted) return;

      if (!teams.ok || teams.data.length === 0) {
        setBackendState({
          mode: teams.ok ? 'no-team' : 'backend-unavailable',
          message: teams.ok
            ? 'Backend collegato, ma nessuna squadra reale trovata: mostro la demo controllata.'
            : 'Errore nella lettura dei team: uso demo/mock.',
        });
        setTeamId(null);
        setSeasonId(null);
        return;
      }

      const targetBuilderSeason = seasons.ok
        ? seasons.data.find(season => season.footballSeason === TEAM_BUILDER_SEASON) ?? null
        : null;
      setBuilderSeason(targetBuilderSeason);
      const targetBuilderTeam = targetBuilderSeason
        ? teams.data.find(item => item.seasonId === targetBuilderSeason.id) ?? null
        : null;
      setBuilderExistingTeamId(targetBuilderTeam?.id ?? null);

      const team = targetBuilderTeam ?? teams.data[0];
      setTeamId(team.id);
      setSeasonId(team.seasonId);
      const builderSeasonId = targetBuilderSeason?.id ?? team.seasonId;
      const [portfolio, players, quotes, votes, settlement, operationsResult, syntheticRows, builderPlayersResult, builderQuotesResult, builderVotesResult] = await Promise.all([
        authedApi.getTeamPortfolio(team.id),
        authedApi.getPlayers({ seasonId: team.seasonId }),
        authedApi.getQuotes({ seasonId: team.seasonId }),
        authedApi.getVotes({ seasonId: team.seasonId }),
        authedApi.getTeamFinalSettlement(team.id),
        authedApi.getMarketOperations(team.id),
        loadSyntheticQuoteRows().catch(() => [] as RawSyntheticRoundQuote[]),
        authedApi.getPlayers({ seasonId: builderSeasonId }),
        authedApi.getQuotes({ seasonId: builderSeasonId }),
        authedApi.getVotes({ seasonId: builderSeasonId }),
      ]);

      if (!mounted) return;
      if (!portfolio.ok) {
        setBackendState({ mode: 'backend-unavailable', message: 'Team trovato, ma il portafoglio non e leggibile: uso demo/mock.' });
        setTeamId(null);
        setSeasonId(null);
        return;
      }

      const backendPlayers = players.ok ? players.data : [];
      const backendQuotes = quotes.ok ? quotes.data : [];
      const backendVotes = votes.ok ? votes.data : [];
      const voteRows = votesToRows(backendVotes);
      const normalizedPositions = normalizePortfolioPositions(portfolio.data, backendPlayers, syntheticRows, voteRows);
      const normalizedMarket = normalizeMarketPlayers(backendPlayers, backendQuotes, normalizedPositions, syntheticRows, voteRows);
      const builderBackendPlayers = builderPlayersResult.ok ? builderPlayersResult.data : backendPlayers;
      const builderBackendQuotes = builderQuotesResult.ok ? builderQuotesResult.data : backendQuotes;
      const builderBackendVotes = builderVotesResult.ok ? builderVotesResult.data : backendVotes;
      const builderVoteRows = votesToRows(builderBackendVotes);
      const normalizedBuilderMarket = normalizeMarketPlayers(builderBackendPlayers, builderBackendQuotes, [], syntheticRows, builderVoteRows, 600);
      const builderRounds = builderBackendVotes.map(vote => Number(vote.round)).filter(Number.isFinite);

      setPositions(normalizedPositions.length > 0 ? normalizedPositions : demoPositions);
      setMarketPlayers(normalizedMarket.length > 0 ? normalizedMarket : demoMarketPlayers);
      setBuilderPlayers(normalizedBuilderMarket.length > 0 ? normalizedBuilderMarket : demoMarketPlayers);
      setBuilderVotesMaxRound(builderRounds.length > 0 ? Math.max(...builderRounds) : null);
      setBuilderTrendSource(normalizedBuilderMarket.some(player => player.trend?.some(point => point.source === 'synthetic')) ? 'synthetic' : 'mock');
      setOperations(operationsResult.ok && operationsResult.data.length > 0 ? backendOperationsToDemo(operationsResult.data) : initialOperations);
      setVirtualCashBalance(Number(portfolio.data.summary.virtualCashBalance ?? 0));
      setFinancialSnapshot(buildFinancialSnapshot(portfolio.data, settlement.ok ? settlement.data : undefined));
      setDataSource(normalizedPositions.length > 0 ? 'backend' : 'mock');
      setBackendState({
        mode: 'connected',
        message: normalizedPositions.length > 0
          ? 'Backend collegato: dati team e portafoglio letti dalla demo. BUY/SELL reali demo richiedono conferma.'
          : 'Backend collegato, ma il portafoglio e vuoto: mostro la demo controllata.',
        teamLabel: team.id,
      });
    }

    loadBackendData();
    return () => {
      mounted = false;
    };
  }, [reloadNonce]);

  if (tab === null) {
    return <Navigate to="/partecipante-favc/overview" replace />;
  }

  const activePositions = positions.filter(position => position.status === 'ACTIVE');
  const counts = roleCount(positions);
  const calculatedPortfolioValue = activePositions.reduce((sum, position) => sum + calculatePositionValue(position), 0);
  const totalCapitalDeposited = financialSnapshot?.totalCapitalDeposited
    ?? operations.reduce((sum, operation) => sum + operation.capitalAdded, 0);
  const currentPortfolioValue = financialSnapshot?.currentPortfolioValue && financialSnapshot.currentPortfolioValue > 0
    ? financialSnapshot.currentPortfolioValue
    : calculatedPortfolioValue;
  const netLiquidationValue = financialSnapshot?.netLiquidationValue && financialSnapshot.netLiquidationValue > 0
    ? financialSnapshot.netLiquidationValue
    : currentPortfolioValue * (1 - SELL_COMMISSION_RATE);
  const finalLiquidationValue = financialSnapshot?.finalLiquidationValue && financialSnapshot.finalLiquidationValue > 0
    ? financialSnapshot.finalLiquidationValue
    : netLiquidationValue + virtualCashBalance;
  const profitLoss = financialSnapshot?.profitLoss ?? finalLiquidationValue - totalCapitalDeposited;
  const roiPct = financialSnapshot?.roiPct ?? (totalCapitalDeposited > 0 ? (profitLoss / totalCapitalDeposited) * 100 : 0);
  const teamTrend = buildTeamTrendFromPositions(positions, { virtualCashBalance, totalCapitalDeposited, lastRounds: 38 });
  const latestTeamTrend = teamTrend.slice(-5);
  const hasSyntheticTrend = positions.some(position => position.trend?.some(point => point.source === 'synthetic'));
  const connectionBadges = [
    backendState.mode === 'connected' ? 'Backend collegato' : backendState.mode === 'backend-unavailable' ? 'Backend non disponibile' : 'Demo backend',
    dataSource === 'backend' ? 'Dati backend' : 'Fallback mock',
    backendState.mode === 'connected' && dataSource === 'backend' ? 'Operazioni reali demo backend' : 'Operazioni simulate/mock',
    hasSyntheticTrend ? 'Trend synthetic' : 'Trend mock/official',
    'Nessun payout reale',
  ];

  const rankedPlayers = [...activePositions].sort((a, b) => getPositionRoi(b) - getPositionRoi(a));
  const topPlayers = rankedPlayers.slice(0, 5);
  const worstPlayers = rankedPlayers.slice(-5).reverse();
  const availableTeams = ['Tutte', ...Array.from(new Set(marketPlayers.map(player => player.realTeam))).sort()];
  const filteredMarket = filterAndSortMarketPlayers(marketPlayers, marketFilters);
  const roleGroups: Array<{ role: FavcRole; title: string }> = [
    { role: 'P', title: 'Portieri' },
    { role: 'D', title: 'Difensori' },
    { role: 'C', title: 'Centrocampisti' },
    { role: 'A', title: 'Attaccanti' },
  ];
  const sellOperations = operations.filter(operation => operation.type === 'SELL');
  const realDemoActionsEnabled = backendState.mode === 'connected' && dataSource === 'backend' && Boolean(teamId);

  async function confirmTrade() {
    if (!tradeDialog) return;

    if (!realDemoActionsEnabled || !teamId) {
      setTradeDialog(null);
      setTradeStatus({
        tone: 'info',
        message: 'Backend demo non collegato: operazione non inviata. Usa la simulazione locale per stimare cambio, cash e ROI.',
      });
      return;
    }

    setTradeSubmitting(true);
    setTradeError('');
    const api = createFantaTradingApi();
    const result = tradeDialog.type === 'buy'
      ? await api.buyPlayer(teamId, tradeDialog.player.id)
      : await api.sellPlayer(teamId, { positionId: tradeDialog.position.id });

    setTradeSubmitting(false);
    if (!result.ok) {
      setTradeError(result.status ? `${result.error} (${result.status})` : result.error);
      return;
    }

    setTradeDialog(null);
    setTradeStatus({
      tone: 'success',
      message: tradeDialog.type === 'buy'
        ? `${tradeDialog.player.playerName} acquistato nella demo backend. Portafoglio aggiornato.`
        : `${tradeDialog.position.playerName} venduto nella demo backend. Portafoglio aggiornato.`,
    });
    setReloadNonce(value => value + 1);
  }

  function requestBuy(player: DemoMarketPlayer) {
    setSimulationNotice('');
    setTradeError('');
    if (!realDemoActionsEnabled) {
      setTradeStatus({
        tone: 'info',
        message: 'Backend offline o fallback mock attivo: acquisto non inviato. La simulazione locale resta disponibile nella pagina Operazioni.',
      });
      return;
    }
    setTradeDialog({ type: 'buy', player });
  }

  function requestSell(position: DemoPosition) {
    setTradeError('');
    if (!realDemoActionsEnabled) {
      setTradeStatus({
        tone: 'info',
        message: 'Backend offline o fallback mock attivo: vendita non inviata. La simulazione locale resta disponibile nella pagina Operazioni.',
      });
      return;
    }
    setTradeDialog({ type: 'sell', position });
  }

  const hasActiveTeam = dataSource === 'backend' && Boolean(teamId);
  const hasRoster = activePositions.length > 0;
  const heroTitle = tab === 'crea-squadra'
    ? 'Crea la tua squadra 2025/26'
    : tab === 'simulazione-stagione'
      ? hasActiveTeam ? 'La mia simulazione 2025/26' : 'Simulazione 2025/26'
      : hasActiveTeam ? 'La mia rosa FAVC' : 'Alpha Trading Club';
  const heroSubtitle = tab === 'crea-squadra'
    ? 'Capitale virtuale, 25 giocatori reali, commissione acquisto 2%. Nessun pagamento reale, nessun payout reale.'
    : `${backendState.message} Modello FREE_ACCESS_VIRTUAL_CAPITAL: capitale virtuale, ranking ROI%, nessun payout reale.`;

  return (
    <>
      <div className="participant-hero compact-hero">
        <div>
          <StatusBadges items={connectionBadges} />
          <h1>{heroTitle}</h1>
          <p>{heroSubtitle}</p>
        </div>
        {tab === 'simulazione-stagione' && !hasActiveTeam ? (
          <div className="participant-hero-panel participant-hero-cta">
            <span>Nessuna rosa attiva</span>
            <strong>Crea squadra</strong>
            <small>Costruisci 25 giocatori 3/8/8/6 e avvia la simulazione storica.</small>
            <Link className="button button-primary" to="/partecipante-favc/crea-squadra" style={{ marginTop: 12 }}>Vai a Crea squadra</Link>
          </div>
        ) : (
          <div className="participant-hero-panel">
            <span>{tab === 'simulazione-stagione' ? 'Guadagno % stimato' : 'Guadagno % / ROI'}</span>
            <strong className={roiPct >= 0 ? 'positive' : 'negative'}>{tab === 'simulazione-stagione' && !hasRoster ? 'n.d.' : formatSignedPercent(roiPct, 2)}</strong>
            <small>{tab === 'simulazione-stagione' ? `Aggiornato dentro la pagina · stagione 2025/26` : financialSnapshot?.rankByRoi ? `Ranking ROI #${financialSnapshot.rankByRoi}` : 'Settlement virtuale · nessun payout reale'}</small>
          </div>
        )}
      </div>

      <nav className="participant-tabs">
        {TABS.map(item => (
          <Link className={tab === item.id ? 'active' : ''} to={item.path} key={item.id}>{item.label}</Link>
        ))}
      </nav>

      {tradeStatus && (
        <div className={`backend-banner trade-status trade-status-${tradeStatus.tone}`}>
          <strong>{tradeStatus.tone === 'success' ? 'Operazione completata' : tradeStatus.tone === 'error' ? 'Errore operazione' : 'Modalita demo'}</strong>
          <span>{tradeStatus.message}</span>
        </div>
      )}

      {tab === 'overview' && (
        <>
          <Section title="Sintesi partecipante">
            <div className="metric-grid favc-metric-grid">
              <MetricCard label="Capitale virtuale" value={formatCredits(totalCapitalDeposited)} sub="totalCapitalDeposited" color="var(--teal)" />
              <MetricCard label="Cash virtuale" value={formatCredits(virtualCashBalance)} sub="virtualCashBalance" color="var(--green)" />
              <MetricCard label="Net liquidation" value={formatCredits(netLiquidationValue)} sub="rosa dopo fee vendita" color="var(--purple)" />
              <MetricCard label="Final liquidation" value={formatCredits(finalLiquidationValue)} sub="net + cash" color="var(--accent)" />
              <MetricCard label="Profit / loss" value={formatSignedCredits(profitLoss)} sub="settlement virtuale" color={profitLoss >= 0 ? 'var(--green)' : 'var(--red)'} />
              <MetricCard label="ROI%" value={formatSignedPercent(roiPct)} sub="classifica principale" color={roiPct >= 0 ? 'var(--green)' : 'var(--red)'} />
              <MetricCard label="Ranking ROI%" value={financialSnapshot?.rankByRoi ? `#${financialSnapshot.rankByRoi}` : 'Demo'} sub="ordinamento percentuale" color="var(--amber)" />
              <MetricCard label="Rosa" value={`${activePositions.length}/25`} sub={`${counts.P}/3 P, ${counts.D}/8 D, ${counts.C}/8 C, ${counts.A}/6 A`} color="var(--accent)" />
            </div>
          </Section>

          <div className="favc-dashboard-grid">
            <Section title="Andamento squadra">
              <div className="card chart-card">
                <TeamTrendChart data={teamTrend} valueKey="totalValue" />
              </div>
            </Section>
            <Section title="ROI squadra">
              <div className="card chart-card">
                <TeamTrendChart data={teamTrend} valueKey="roiPct" />
              </div>
            </Section>
          </div>

          <div className="favc-dashboard-grid">
            <PlayerListPanel title="Top 5 migliori" players={topPlayers} onSelect={player => setSelectedPlayer(positionToCard(player))} />
            <PlayerListPanel title="Top 5 peggiori" players={worstPlayers} onSelect={player => setSelectedPlayer(positionToCard(player))} />
          </div>
        </>
      )}

      {tab === 'mercato' && (
        <Section title="Mercato demo">
          <div className="market-filters extended-filters">
            <label>Search nome<input value={marketFilters.search} onChange={event => setMarketFilters({ ...marketFilters, search: event.target.value })} placeholder="Cerca giocatore" /></label>
            <label>Ruolo<select value={marketFilters.role} onChange={event => setMarketFilters({ ...marketFilters, role: event.target.value as FavcRole | 'all' })}><option value="all">Tutti</option><option value="P">Portieri</option><option value="D">Difensori</option><option value="C">Centrocampisti</option><option value="A">Attaccanti</option></select></label>
            <label>Squadra<select value={marketFilters.team} onChange={event => setMarketFilters({ ...marketFilters, team: event.target.value })}>{availableTeams.map(team => <option value={team} key={team}>{team}</option>)}</select></label>
            <label>Prezzo<select value={marketFilters.price} onChange={event => setMarketFilters({ ...marketFilters, price: event.target.value as MarketPriceFilter })}><option value="all">Tutti</option><option value="low">fino a 8</option><option value="mid">9 - 12</option><option value="high">13+</option></select></label>
            <label>Trend<select value={marketFilters.trend} onChange={event => setMarketFilters({ ...marketFilters, trend: event.target.value as MarketTrendFilter })}><option value="all">Tutti</option><option value="up">rialzo</option><option value="stable">stabile</option><option value="down">ribasso</option></select></label>
            <label>Ordina<select value={marketFilters.sortBy} onChange={event => setMarketFilters({ ...marketFilters, sortBy: event.target.value as MarketSortKey })}><option value="return">rendimento stimato</option><option value="price">prezzo</option><option value="name">nome</option><option value="role">ruolo</option><option value="quoteChange">variazione quota</option></select></label>
            <label className="checkbox-filter"><input type="checkbox" checked={marketFilters.onlyWithTrend} onChange={event => setMarketFilters({ ...marketFilters, onlyWithTrend: event.target.checked })} /> Solo con trend</label>
          </div>

          {simulationNotice && <div className="backend-banner backend-no-team"><strong>Simulazione</strong><span>{simulationNotice}</span></div>}

          <div className="player-card-grid market-card-grid">
            {filteredMarket.map(player => {
              const card = {
                ...marketToCard(player),
                actionLabel: realDemoActionsEnabled ? 'Compra' : 'Compra demo',
              };
              return (
                <PlayerCard
                  key={player.id}
                  player={card}
                  compact
                  onSelect={setSelectedPlayer}
                  onAction={() => requestBuy(player)}
                />
              );
            })}
          </div>
          {filteredMarket.length === 0 && <EmptyState title="Nessun giocatore trovato" text="Modifica filtri o ricerca per vedere altri asset virtuali." />}
          <div className="table-note">
            {realDemoActionsEnabled
              ? 'Compra modifica il team demo backend solo dopo conferma. Nessun denaro reale.'
              : 'Compra demo resta simulata quando il backend non e collegato.'}
          </div>
        </Section>
      )}

      {tab === 'rosa' && (
        <>
          <div className="favc-dashboard-grid">
            <Section title="Andamento rosa">
              <div className="card chart-card"><TeamTrendChart data={teamTrend} valueKey="portfolioValue" /></div>
            </Section>
            <Section title="Ultimi 5 round">
              <div className="card table-scroll">
                <table>
                  <thead><tr><th>Round</th><th>Valore rosa</th><th>Valore squadra</th><th>ROI</th></tr></thead>
                  <tbody>{latestTeamTrend.map(point => <tr key={point.round}><td>G{point.round}</td><td>{formatCredits(point.portfolioValue)}</td><td>{formatCredits(point.totalValue)}</td><td className={valueTone(point.roiPct)}>{formatSignedPercent(point.roiPct)}</td></tr>)}</tbody>
                </table>
              </div>
            </Section>
          </div>

          {roleGroups.map(group => {
            const players = activePositions.filter(position => position.role === group.role);
            const value = players.reduce((sum, player) => sum + calculatePositionValue(player), 0);
            const pl = players.reduce((sum, player) => sum + getPositionPL(player), 0);
            const initial = players.reduce((sum, player) => sum + player.initialQuote, 0);
            const roi = initial > 0 ? (pl / initial) * 100 : 0;
            return (
              <Section title={`${group.title} ${players.length}/${roleLimits[group.role]}`} key={group.role}>
                <div className="role-summary-row">
                  <span>Valore reparto <strong>{formatCredits(value)}</strong></span>
                  <span>P/L <strong className={valueTone(pl)}>{formatSignedCredits(pl)}</strong></span>
                  <span>ROI <strong className={valueTone(roi)}>{formatSignedPercent(roi)}</strong></span>
                </div>
                <RosterTable players={players} onSelect={player => setSelectedPlayer(positionToCard(player))} onSell={requestSell} realActionsEnabled={realDemoActionsEnabled} />
              </Section>
            );
          })}
        </>
      )}

      {tab === 'crea-squadra' && (
        <TeamBuilderPanel
          players={builderPlayers}
          seasonId={builderSeason?.id ?? seasonId}
          seasonLabel={builderSeason?.footballSeason ?? TEAM_BUILDER_SEASON}
          seasonStatus={builderSeason?.status ?? null}
          votesMaxRound={builderVotesMaxRound}
          trendSource={builderTrendSource}
          existingTeamId={builderExistingTeamId}
          backendConnected={backendState.mode === 'connected' && dataSource === 'backend'}
          onContinueExisting={() => navigate('/partecipante-favc/rosa')}
          onCreated={(createdTeamId, createdSeasonId) => {
            setReloadNonce(value => value + 1);
            navigate(`/partecipante-favc/simulazione-stagione?teamId=${createdTeamId}&seasonId=${createdSeasonId}`);
          }}
        />
      )}

      {tab === 'simulazione-stagione' && (
        <SeasonSimulationPanel
          seasonId={builderSeason?.id ?? seasonId}
          seasonLabel={builderSeason?.footballSeason ?? TEAM_BUILDER_SEASON}
        />
      )}

      {tab === 'operazioni' && (
        <>
          <Section title="Operazioni">
            <div className="card table-scroll">
              <table>
                <thead>
                  <tr><th>Data/Round</th><th>Tipo</th><th>Giocatore</th><th>Gross</th><th>Commissione</th><th>Net</th><th>Capital added</th><th>Cash before</th><th>Cash after</th></tr>
                </thead>
                <tbody>
                  {operations.map(operation => (
                    <tr key={operation.id}>
                      <td>{operation.round}</td>
                      <td><span className={`badge ${operation.type === 'BUY' ? 'badge-blue' : 'badge-amber'}`}>{operation.type}</span></td>
                      <td><strong>{operation.playerName}</strong></td>
                      <td>{formatCredits(operation.grossAmount)}</td>
                      <td>{formatCredits(operation.commission)}</td>
                      <td>{formatCredits(operation.netAmount)}</td>
                      <td>{formatCredits(operation.capitalAdded)}</td>
                      <td>{formatCredits(operation.cashBefore)}</td>
                      <td>{formatCredits(operation.cashAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sellOperations.length === 0 && (
              <EmptyState title="Nessuna vendita reale nel team demo" text="Il team demo contiene solo acquisti iniziali. Le vendite saranno abilitate nella simulazione cambio." />
            )}
          </Section>
          <TradeSimulationPanel
            positions={positions}
            marketPlayers={marketPlayers}
            virtualCashBalance={virtualCashBalance}
            totalCapitalDeposited={totalCapitalDeposited}
            currentPortfolioValue={currentPortfolioValue}
          />
        </>
      )}

      {tab === 'settlement' && (
        <Section title="Settlement finale virtuale">
          <div className="favc-settlement-grid">
            <div className="card">
              <div className="settlement-formula">
                <div><span>Total capital deposited</span><strong>{formatCredits(totalCapitalDeposited)}</strong></div>
                <div><span>Net liquidation value</span><strong>{formatCredits(netLiquidationValue)}</strong></div>
                <div><span>Virtual cash balance</span><strong>{formatCredits(virtualCashBalance)}</strong></div>
                <div><span>Final liquidation value</span><strong>{formatCredits(finalLiquidationValue)}</strong></div>
                <div><span>Profit/Loss</span><strong className={valueTone(profitLoss)}>{formatSignedCredits(profitLoss)}</strong></div>
                <div><span>ROI%</span><strong className={valueTone(roiPct)}>{formatSignedPercent(roiPct)}</strong></div>
              </div>
              <div className="table-note">finalLiquidationValue = netLiquidationValue + virtualCashBalance. Il ROI non si aggiunge una seconda volta al valore finale.</div>
            </div>
            <div className="notice-card settlement-notice">
              <span className="badge badge-amber">Settlement virtuale</span>
              <strong>Nessun pagamento reale</strong>
              <p>Il settlement e solo contabile per il pilot FREE_ACCESS_VIRTUAL_CAPITAL. Non esiste payout reale o credito riscattabile.</p>
            </div>
          </div>
        </Section>
      )}

      <PlayerDetailDrawer player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      {tradeDialog && (
        <TradeConfirmModal
          {...(tradeDialog.type === 'buy'
            ? { type: 'buy' as const, player: tradeDialog.player }
            : { type: 'sell' as const, position: tradeDialog.position })}
          positions={positions}
          virtualCashBalance={virtualCashBalance}
          totalCapitalDeposited={totalCapitalDeposited}
          submitting={tradeSubmitting}
          error={tradeError}
          onCancel={() => {
            setTradeDialog(null);
            setTradeError('');
          }}
          onConfirm={confirmTrade}
        />
      )}
    </>
  );
}

function PlayerListPanel({ title, players, onSelect }: { title: string; players: DemoPosition[]; onSelect: (player: DemoPosition) => void }) {
  return (
    <Section title={title}>
      <div className="card table-scroll">
        <table>
          <thead><tr><th>Giocatore</th><th>Club</th><th>Ruolo</th><th>P/L</th><th>ROI</th></tr></thead>
          <tbody>
            {players.map(player => (
              <tr key={player.id} className="clickable-row" onClick={() => onSelect(player)}>
                <td><strong>{player.playerName}</strong></td>
                <td>{player.realTeam}</td>
                <td><span className="role-badge">{player.role}</span></td>
                <td className={valueTone(getPositionPL(player))}>{formatSignedCredits(getPositionPL(player))}</td>
                <td className={valueTone(getPositionRoi(player))}>{formatSignedPercent(getPositionRoi(player))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function RosterTable({
  players,
  onSelect,
  onSell,
  realActionsEnabled,
}: {
  players: DemoPosition[];
  onSelect: (player: DemoPosition) => void;
  onSell: (player: DemoPosition) => void;
  realActionsEnabled: boolean;
}) {
  return (
    <div className="card table-scroll">
      <table className="portfolio-table compact-table">
        <thead>
          <tr><th>Trend</th><th>Giocatore</th><th>Club</th><th>Ruolo</th><th>Qt. iniz.</th><th>Qt. corr.</th><th>Valore</th><th>P/L</th><th>ROI</th><th>Azioni</th></tr>
        </thead>
        <tbody>
          {players.map(player => {
            const value = calculatePositionValue(player);
            const pl = getPositionPL(player);
            const roi = getPositionRoi(player);
            return (
              <tr key={player.id}>
                <td className="mini-trend-cell"><PlayerTrendChart data={player.trend ?? []} mode="mini" /></td>
                <td><strong>{player.playerName}</strong></td>
                <td>{player.realTeam}</td>
                <td><span className="role-badge">{player.role}</span></td>
                <td>{formatCredits(player.initialQuote)}</td>
                <td>{formatCredits(player.currentQuote)}</td>
                <td>{formatCredits(value)}</td>
                <td className={valueTone(pl)}>{formatSignedCredits(pl)}</td>
                <td className={valueTone(roi)}>{formatSignedPercent(roi)}</td>
                <td className="row-actions">
                  <button className="favc-action" type="button" onClick={() => onSelect(player)}>Dettaglio</button>
                  <button className="favc-action favc-action-sell" type="button" onClick={() => onSell(player)}>
                    {realActionsEnabled ? 'Vendi' : 'Vendi demo'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
