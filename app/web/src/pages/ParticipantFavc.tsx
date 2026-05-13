import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  createFantaTradingApi,
  getStoredAccessToken,
  type ApiMode,
  type BackendPlayer,
  type BackendPortfolio,
  type BackendQuote,
} from '../api';
import { EmptyState, MetricCard, Section, StatusBadges } from '../components';
import PlayerCard, { type PlayerCardData } from '../components/PlayerCard';
import PlayerTrendChart from '../components/PlayerTrendChart';
import {
  BUY_COMMISSION_RATE,
  SELL_COMMISSION_RATE,
  calculatePositionValue,
  demoMarketPlayers,
  demoPositions,
  initialOperations,
  portfolioHistory,
  rankingExample,
  roleLimits,
  roleNames,
  type DemoMarketPlayer,
  type DemoOperation,
  type DemoPosition,
  type FavcRole,
} from '../mock/favcDemoData';
import { AXIS_STYLE, COLORS, GRID_STYLE, TOOLTIP_STYLE } from '../data';
import {
  createMockTrend,
  normalizeSyntheticTrend,
  type PlayerTrendPoint,
  type RawSyntheticRoundQuote,
} from '../utils/playerTrend';
import { formatCredits, formatPercent, formatSignedCredits, formatSignedPercent, valueTone } from '../utils/format';

type PriceFilter = 'all' | 'low' | 'mid' | 'high';
type PerformanceFilter = 'all' | 'positive' | 'negative';
type DataSource = 'mock' | 'backend';

type MarketRow = {
  id: string;
  playerId?: string;
  playerName: string;
  realTeam: string;
  role: FavcRole;
  quote: number;
  trendPct: number;
  performancePct: number;
  mode: 'BUY' | 'SELL';
  positionId?: string;
  available?: boolean;
  trend: PlayerTrendPoint[];
};

type BackendUiState = {
  mode: ApiMode | 'checking';
  message: string;
  teamLabel?: string;
};

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

function buyCommission(grossAmount: number) {
  return grossAmount * BUY_COMMISSION_RATE;
}

function sellCommission(grossAmount: number) {
  return grossAmount * SELL_COMMISSION_RATE;
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

function getPositionPL(position: DemoPosition) {
  if (position.status === 'SOLD') return 0;
  return calculatePositionValue(position) - position.initialQuote;
}

function getPositionRoi(position: DemoPosition) {
  if (position.initialQuote <= 0 || position.status === 'SOLD') return 0;
  return (getPositionPL(position) / position.initialQuote) * 100;
}

function roleCount(positions: DemoPosition[]) {
  return positions
    .filter(position => position.status === 'ACTIVE')
    .reduce(
      (counts, position) => ({ ...counts, [position.role]: counts[position.role] + 1 }),
      { P: 0, D: 0, C: 0, A: 0 } as Record<FavcRole, number>,
    );
}

function marketValue(player: Pick<MarketRow, 'quote' | 'trendPct'>) {
  return player.quote * (1 + player.trendPct / 100);
}

function normalizePortfolioPositions(
  portfolio: BackendPortfolio,
  players: BackendPlayer[],
  syntheticRows: RawSyntheticRoundQuote[],
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
      trend: normalizeSyntheticTrend(syntheticRows, player?.externalId ?? position.playerId, {
        initialQuote,
        currentQuote,
        fantasyMultiplier,
        playerName,
      }),
    };
  });
}

function normalizeMarketPlayers(
  players: BackendPlayer[],
  quotes: BackendQuote[],
  currentPositions: DemoPosition[],
  syntheticRows: RawSyntheticRoundQuote[],
) {
  const ownedIds = new Set(currentPositions.map(position => position.playerId).filter(Boolean));
  return players
    .filter(player => !ownedIds.has(player.externalId ?? player.id))
    .slice(0, 24)
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
        trend: normalizeSyntheticTrend(syntheticRows, player.externalId ?? player.id, {
          initialQuote,
          currentQuote,
          playerName,
        }),
      };
    });
}

function positionToCard(position: DemoPosition, actionLabel?: string, actionDisabled?: boolean): PlayerCardData {
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
    actionLabel,
    actionDisabled,
  };
}

export default function ParticipantFavc() {
  const [positions, setPositions] = useState<DemoPosition[]>(() => demoPositions);
  const [marketPlayers, setMarketPlayers] = useState<DemoMarketPlayer[]>(() => demoMarketPlayers);
  const [operations, setOperations] = useState<DemoOperation[]>(() => initialOperations);
  const [virtualCashBalance, setVirtualCashBalance] = useState(0);
  const [backendState, setBackendState] = useState<BackendUiState>({
    mode: 'checking',
    message: 'Verifica connessione backend in corso...',
  });
  const [dataSource, setDataSource] = useState<DataSource>('mock');
  const [roleFilter, setRoleFilter] = useState<FavcRole | 'all'>('all');
  const [teamFilter, setTeamFilter] = useState('Tutte');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [performanceFilter, setPerformanceFilter] = useState<PerformanceFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCardData | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadBackendData() {
      const api = createFantaTradingApi();
      const health = await api.health();

      if (!mounted) return;

      if (!health.ok) {
        setBackendState({
          mode: 'backend-unavailable',
          message: 'Backend non disponibile: uso fallback demo/mock locale.',
        });
        return;
      }

      const token = getStoredAccessToken();
      if (!token) {
        setBackendState({
          mode: 'missing-token',
          message: 'Backend raggiungibile, ma manca un token JWT locale: uso demo/mock read-only.',
        });
        return;
      }

      const teams = await api.getMyTeams();
      if (!mounted) return;

      if (!teams.ok) {
        setBackendState({
          mode: teams.status === 401 || teams.status === 403 ? 'missing-token' : 'backend-unavailable',
          message: teams.status === 401 || teams.status === 403
            ? 'Token non valido o scaduto: uso demo/mock.'
            : 'Errore nella lettura dei team: uso demo/mock.',
        });
        return;
      }

      if (teams.data.length === 0) {
        setBackendState({
          mode: 'no-team',
          message: 'Backend collegato, ma nessuna squadra reale trovata: mostro la demo controllata.',
        });
        return;
      }

      const team = teams.data[0];
      const [portfolio, players, quotes, syntheticRows] = await Promise.all([
        api.getTeamPortfolio(team.id),
        api.getPlayers({ seasonId: team.seasonId }),
        api.getQuotes({ seasonId: team.seasonId }),
        loadSyntheticQuoteRows().catch(() => [] as RawSyntheticRoundQuote[]),
      ]);

      if (!mounted) return;

      if (!portfolio.ok) {
        setBackendState({
          mode: 'backend-unavailable',
          message: 'Team trovato, ma il portafoglio non e leggibile: uso demo/mock.',
        });
        return;
      }

      const backendPlayers = players.ok ? players.data : [];
      const backendQuotes = quotes.ok ? quotes.data : [];
      const normalizedPositions = normalizePortfolioPositions(portfolio.data, backendPlayers, syntheticRows);
      const normalizedMarket = normalizeMarketPlayers(backendPlayers, backendQuotes, normalizedPositions, syntheticRows);

      setPositions(normalizedPositions.length > 0 ? normalizedPositions : demoPositions);
      setMarketPlayers(normalizedMarket.length > 0 ? normalizedMarket : demoMarketPlayers);
      setVirtualCashBalance(Number(portfolio.data.summary.virtualCashBalance ?? portfolio.data.summary.currentPortfolioValue ?? 0));
      setDataSource(normalizedPositions.length > 0 ? 'backend' : 'mock');
      setBackendState({
        mode: 'connected',
        message: normalizedPositions.length > 0
          ? 'Backend collegato: dati team e portafoglio letti in modalita read-only.'
          : 'Backend collegato, ma il portafoglio e vuoto: mostro la demo controllata.',
        teamLabel: team.id,
      });
    }

    loadBackendData();
    return () => {
      mounted = false;
    };
  }, []);

  const activePositions = useMemo(
    () => positions.filter(position => position.status === 'ACTIVE'),
    [positions],
  );

  const counts = useMemo(() => roleCount(positions), [positions]);

  const totalCapitalDeposited = useMemo(
    () => operations.reduce((sum, operation) => sum + operation.capitalAdded, 0),
    [operations],
  );

  const currentPortfolioValue = useMemo(
    () => activePositions.reduce((sum, position) => sum + calculatePositionValue(position), 0),
    [activePositions],
  );

  const totalPlayerPL = useMemo(
    () => activePositions.reduce((sum, position) => sum + getPositionPL(position), 0),
    [activePositions],
  );

  const netLiquidationValue = currentPortfolioValue * (1 - SELL_COMMISSION_RATE);
  const finalLiquidationValue = netLiquidationValue + virtualCashBalance;
  const profitLoss = finalLiquidationValue - totalCapitalDeposited;
  const roiPct = totalCapitalDeposited > 0 ? (profitLoss / totalCapitalDeposited) * 100 : 0;

  const chartData = useMemo(() => {
    const today = {
      label: dataSource === 'backend' ? 'Backend' : 'Live',
      portfolioValue: Number(currentPortfolioValue.toFixed(2)),
      roiPct: Number(roiPct.toFixed(2)),
    };
    return [...portfolioHistory.slice(0, -1), today];
  }, [currentPortfolioValue, dataSource, roiPct]);

  const rankingRows = useMemo(() => {
    const liveRow = {
      rank: 0,
      team: dataSource === 'backend' ? 'Team reale read-only' : 'Alpha demo live',
      totalCapitalDeposited: Number(totalCapitalDeposited.toFixed(2)),
      finalValue: Number(finalLiquidationValue.toFixed(2)),
      profitLoss: Number(profitLoss.toFixed(2)),
      roiPct: Number(roiPct.toFixed(2)),
    };

    return [liveRow, ...rankingExample]
      .sort((a, b) => b.roiPct - a.roiPct)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [dataSource, finalLiquidationValue, profitLoss, roiPct, totalCapitalDeposited]);

  const liveTeamName = dataSource === 'backend' ? 'Team reale read-only' : 'Alpha demo live';
  const liveRank = rankingRows.find(row => row.team === liveTeamName)?.rank ?? 0;
  const sourceNote = dataSource === 'backend'
    ? 'Dati team dal backend; trend round-by-round stimato da modello sintetico quando non esiste una serie ufficiale.'
    : 'Modalita demo/mock: dati locali coerenti con FAVC, nessuna API richiesta.';

  const connectionBadges = useMemo(() => {
    if (backendState.mode === 'connected') return ['Backend collegato', 'Read-only', 'Nessun payout reale'];
    if (backendState.mode === 'backend-unavailable') return ['Backend non disponibile', 'Modalita demo/mock', 'Nessun payout reale'];
    if (backendState.mode === 'missing-token') return ['Backend collegato', 'Token mancante', 'Modalita demo/mock'];
    if (backendState.mode === 'no-team') return ['Backend collegato', 'Nessuna squadra reale', 'Modalita demo/mock'];
    return ['Verifica backend', 'Fallback mock pronto', 'Pilot virtuale'];
  }, [backendState.mode]);

  const marketRows = useMemo<MarketRow[]>(() => {
    const ownedRows: MarketRow[] = activePositions.slice(0, 6).map(position => ({
      id: `owned-${position.id}`,
      playerId: position.playerId,
      playerName: position.playerName,
      realTeam: position.realTeam,
      role: position.role,
      quote: position.currentQuote,
      trendPct: getPositionRoi(position),
      performancePct: getPositionRoi(position) / 1.8,
      mode: 'SELL',
      positionId: position.id,
      available: true,
      trend: position.trend ?? createMockTrend(position.initialQuote, position.currentQuote, position.fantasyMultiplier),
    }));

    const buyRows: MarketRow[] = marketPlayers.map(player => ({
      id: player.id,
      playerId: player.playerId,
      playerName: player.playerName,
      realTeam: player.realTeam,
      role: player.role,
      quote: player.quote,
      trendPct: player.trendPct,
      performancePct: player.performancePct,
      mode: 'BUY',
      available: player.available,
      trend: player.trend ?? createMockTrend(player.quote, player.quote * (1 + player.trendPct / 100)),
    }));

    return [...ownedRows, ...buyRows].filter(row => {
      if (roleFilter !== 'all' && row.role !== roleFilter) return false;
      if (teamFilter !== 'Tutte' && row.realTeam !== teamFilter) return false;
      if (search && !row.playerName.toLowerCase().includes(search.toLowerCase())) return false;
      if (performanceFilter === 'positive' && row.performancePct <= 0) return false;
      if (performanceFilter === 'negative' && row.performancePct >= 0) return false;
      if (priceFilter === 'low' && row.quote > 8) return false;
      if (priceFilter === 'mid' && (row.quote < 9 || row.quote > 12)) return false;
      if (priceFilter === 'high' && row.quote < 13) return false;
      return true;
    });
  }, [activePositions, marketPlayers, performanceFilter, priceFilter, roleFilter, search, teamFilter]);

  const availableTeams = useMemo(
    () => ['Tutte', ...Array.from(new Set([...positions, ...marketPlayers].map(item => item.realTeam))).sort()],
    [marketPlayers, positions],
  );

  const lastOperations = operations.slice(-10).reverse();

  function addOperation(operation: Omit<DemoOperation, 'id'>) {
    setOperations(current => [...current, { ...operation, id: `op-${current.length + 1}` }]);
  }

  function sellPosition(positionId: string) {
    const position = positions.find(item => item.id === positionId && item.status === 'ACTIVE');
    if (!position) return;

    const grossAmount = calculatePositionValue(position);
    const commission = sellCommission(grossAmount);
    const netAmount = grossAmount - commission;
    const cashBefore = virtualCashBalance;
    const cashAfter = cashBefore + netAmount;

    setPositions(current => current.map(item => item.id === positionId ? { ...item, status: 'SOLD' } : item));
    setVirtualCashBalance(cashAfter);
    addOperation({
      type: 'SELL',
      playerName: position.playerName,
      grossAmount,
      commission,
      netAmount,
      capitalAdded: 0,
      cashBefore,
      cashAfter,
      round: 'Live',
    });
  }

  function buyPlayer(playerId: string) {
    const player = marketPlayers.find(item => item.id === playerId && item.available);
    if (!player) return;

    const canBuy = counts[player.role] < roleLimits[player.role];
    if (!canBuy) return;

    const grossAmount = player.quote;
    const commission = buyCommission(grossAmount);
    const netAmount = grossAmount + commission;
    const cashBefore = virtualCashBalance;
    const capitalAdded = Math.max(0, netAmount - cashBefore);
    const cashAfter = cashBefore + capitalAdded - netAmount;

    setPositions(current => [
      ...current,
      {
        id: `position-${player.id}`,
        playerId: player.playerId,
        playerName: player.playerName,
        realTeam: player.realTeam,
        role: player.role,
        initialQuote: player.quote,
        currentQuote: player.quote,
        fantasyMultiplier: 1,
        status: 'ACTIVE',
        trend: player.trend ?? createMockTrend(player.quote, player.quote),
      },
    ]);
    setMarketPlayers(current => current.map(item => item.id === playerId ? { ...item, available: false } : item));
    setVirtualCashBalance(cashAfter);
    addOperation({
      type: 'BUY',
      playerName: player.playerName,
      grossAmount,
      commission,
      netAmount,
      capitalAdded,
      cashBefore,
      cashAfter,
      round: 'Live',
    });
  }

  function actionForRow(row: MarketRow) {
    if (row.mode === 'SELL' && row.positionId) {
      const gross = marketValue(row);
      const commission = sellCommission(gross);
      return {
        label: 'Vendi',
        disabled: dataSource === 'backend',
        commission,
        impact: virtualCashBalance + gross - commission,
        onClick: () => sellPosition(row.positionId as string),
      };
    }

    const commission = buyCommission(row.quote);
    const totalCost = row.quote + commission;
    const capitalAdded = Math.max(0, totalCost - virtualCashBalance);
    const canBuy = row.available && counts[row.role] < roleLimits[row.role] && dataSource !== 'backend';

    return {
      label: dataSource === 'backend' ? 'Demo off' : canBuy ? 'Compra' : row.available ? 'Slot pieno' : 'Gia preso',
      disabled: !canBuy,
      commission,
      impact: capitalAdded,
      onClick: () => buyPlayer(row.id),
    };
  }

  function marketRowToCard(row: MarketRow): PlayerCardData {
    const action = actionForRow(row);
    return {
      id: row.mode === 'SELL' && row.positionId ? row.positionId : row.id,
      playerName: row.playerName,
      realTeam: row.realTeam,
      role: row.role,
      initialQuote: row.quote,
      currentQuote: Number(marketValue(row).toFixed(2)),
      fantasyMultiplier: 1,
      status: row.mode === 'SELL' ? 'ACTIVE' : undefined,
      trend: row.trend,
      actionLabel: action.label,
      actionDisabled: action.disabled,
    };
  }

  return (
    <>
      <div className="participant-hero">
        <div>
          <StatusBadges items={connectionBadges} />
          <h1>{dataSource === 'backend' ? 'Team reale read-only' : 'Alpha Trading Club'}</h1>
          <p>
            {backendState.message} {sourceNote} I crediti sono virtuali, il capitale non e denaro reale e il settlement e solo contabile.
          </p>
        </div>
        <div className="participant-hero-panel">
          <span>ROI live</span>
          <strong>{formatSignedPercent(roiPct, 2)}</strong>
          <small>Ranking #{liveRank} per rendimento percentuale</small>
        </div>
      </div>

      <div className={`backend-banner backend-${backendState.mode}`}>
        <div>
          <strong>{backendState.mode === 'connected' ? 'Backend collegato' : backendState.mode === 'backend-unavailable' ? 'Backend non disponibile' : 'Modalita demo/mock'}</strong>
          <span>{backendState.message}</span>
        </div>
        {backendState.teamLabel && <span className="badge badge-blue">team {backendState.teamLabel}</span>}
      </div>

      <Section title="Dashboard Partecipante">
        <div className="metric-grid favc-metric-grid">
          <MetricCard label="Capitale virtuale depositato" value={formatCredits(totalCapitalDeposited)} sub="cresce solo quando il cash non basta" color="var(--teal)" />
          <MetricCard label="Valore rosa" value={formatCredits(currentPortfolioValue)} sub={`${activePositions.length} giocatori attivi`} color="var(--accent)" />
          <MetricCard label="Cash virtuale" value={formatCredits(virtualCashBalance)} sub="saldo disponibile mock/read-only" color="var(--green)" />
          <MetricCard label="Profit / loss" value={formatSignedCredits(profitLoss)} sub="settlement virtuale" color={profitLoss >= 0 ? 'var(--green)' : 'var(--red)'} />
          <MetricCard label="ROI%" value={formatSignedPercent(roiPct)} sub="classifica principale" color={roiPct >= 0 ? 'var(--green)' : 'var(--red)'} />
          <MetricCard label="Ranking ROI%" value={`#${liveRank}`} sub={`${rankingRows.length} team demo`} color="var(--amber)" />
          <MetricCard label="Net liquidation" value={formatCredits(netLiquidationValue)} sub="valore rosa dopo fee vendita" color="var(--purple)" />
          <MetricCard label="Final liquidation" value={formatCredits(finalLiquidationValue)} sub="net liquidation + cash" color="var(--accent)" />
        </div>
      </Section>

      <div className="favc-dashboard-grid">
        <Section title="Andamento valore portafoglio">
          <div className="card chart-card">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="label" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(value: number) => `${formatCredits(value)} cr`} />
                <Area type="monotone" dataKey="portfolioValue" name="Valore rosa" stroke={COLORS.blue} fill="rgba(59,130,246,.18)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="ROI nel tempo">
          <div className="card chart-card">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="label" {...AXIS_STYLE} />
                <YAxis tickFormatter={(value: number) => `${value}%`} {...AXIS_STYLE} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(value: number) => formatPercent(value, 2)} />
                <Line type="monotone" dataKey="roiPct" name="ROI%" stroke={COLORS.green} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.green }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <div className="favc-dashboard-grid favc-side-grid">
        <Section title="Composizione rosa 3P/8D/8C/6A">
          <div className="card">
            <div className="favc-role-grid">
              {(Object.keys(roleLimits) as FavcRole[]).map(role => (
                <div className="favc-role-cell" key={role}>
                  <span>{roleNames[role]}</span>
                  <strong>{counts[role]}/{roleLimits[role]}</strong>
                </div>
              ))}
            </div>
            <div className="table-note">
              La rosa attiva resta valida. Vendere libera uno slot; comprare usa prima il cash virtuale e aggiunge capitale solo sul deficit.
            </div>
          </div>
        </Section>

        <Section title="Ranking ROI demo">
          <div className="card table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Pos.</th>
                  <th>Team</th>
                  <th>Capitale</th>
                  <th>Valore finale</th>
                  <th>P/L</th>
                  <th>ROI%</th>
                </tr>
              </thead>
              <tbody>
                {rankingRows.map(row => (
                  <tr key={row.team} className={row.team === liveTeamName || row.rank === 1 ? 'rec-row' : undefined}>
                    <td><strong>#{row.rank}</strong></td>
                    <td>{row.team}</td>
                    <td>{formatCredits(row.totalCapitalDeposited)}</td>
                    <td>{formatCredits(row.finalValue)}</td>
                    <td className={valueTone(row.profitLoss)}>{formatSignedCredits(row.profitLoss)}</td>
                    <td><strong>{formatSignedPercent(row.roiPct)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-note">
              Esempio chiave: Team A 150 -&gt; 180 = +20%, Team B 600 -&gt; 660 = +10%. Team A sta sopra Team B.
            </div>
          </div>
        </Section>
      </div>

      <Section title="Carte giocatore">
        <div className="player-card-grid">
          {positions.map(position => (
            <PlayerCard
              key={position.id}
              player={positionToCard(position)}
              compact
              onSelect={setSelectedPlayer}
            />
          ))}
        </div>
      </Section>

      <Section title="Portafoglio finanziario">
        <div className="card table-scroll">
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Trend</th>
                <th>Giocatore</th>
                <th>Squadra</th>
                <th>Ruolo</th>
                <th>Qt. iniziale</th>
                <th>Qt. corrente</th>
                <th>Valore</th>
                <th>Net liquidabile</th>
                <th>P/L</th>
                <th>ROI</th>
                <th>Multiplier</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(position => {
                const value = calculatePositionValue(position);
                const netValue = value * (1 - SELL_COMMISSION_RATE);
                const pl = getPositionPL(position);
                const singleRoi = getPositionRoi(position);
                return (
                  <tr key={position.id} className="clickable-row" onClick={() => setSelectedPlayer(positionToCard(position))}>
                    <td className="mini-trend-cell">
                      <PlayerTrendChart data={position.trend ?? []} mode="mini" />
                    </td>
                    <td><strong>{position.playerName}</strong></td>
                    <td>{position.realTeam}</td>
                    <td><span className="role-badge">{position.role}</span></td>
                    <td>{formatCredits(position.initialQuote)}</td>
                    <td>{formatCredits(position.currentQuote)}</td>
                    <td>{formatCredits(value)}</td>
                    <td>{formatCredits(netValue)}</td>
                    <td className={valueTone(pl)}>{formatSignedCredits(pl)}</td>
                    <td className={valueTone(singleRoi)}>{formatSignedPercent(singleRoi)}</td>
                    <td>{position.fantasyMultiplier.toFixed(2)}</td>
                    <td><span className={`badge ${position.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>{position.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="portfolio-summary-bar">
            <span>P/L giocatori: <strong className={valueTone(totalPlayerPL)}>{formatSignedCredits(totalPlayerPL)}</strong></span>
            <span>Valore corrente: <strong>{formatCredits(currentPortfolioValue)}</strong></span>
            <span>Posizioni attive: <strong>{activePositions.length}/25</strong></span>
          </div>
        </div>
      </Section>

      <Section title="Mercato demo trading">
        <div className="market-filters">
          <label>
            Search nome
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cerca giocatore" />
          </label>
          <label>
            Ruolo
            <select value={roleFilter} onChange={event => setRoleFilter(event.target.value as FavcRole | 'all')}>
              <option value="all">Tutti</option>
              <option value="P">Portieri</option>
              <option value="D">Difensori</option>
              <option value="C">Centrocampisti</option>
              <option value="A">Attaccanti</option>
            </select>
          </label>
          <label>
            Squadra
            <select value={teamFilter} onChange={event => setTeamFilter(event.target.value)}>
              {availableTeams.map(team => <option value={team} key={team}>{team}</option>)}
            </select>
          </label>
          <label>
            Prezzo
            <select value={priceFilter} onChange={event => setPriceFilter(event.target.value as PriceFilter)}>
              <option value="all">Tutti</option>
              <option value="low">fino a 8</option>
              <option value="mid">9 - 12</option>
              <option value="high">13+</option>
            </select>
          </label>
          <label>
            Trend
            <select value={performanceFilter} onChange={event => setPerformanceFilter(event.target.value as PerformanceFilter)}>
              <option value="all">Tutti</option>
              <option value="positive">rialzo</option>
              <option value="negative">ribasso</option>
            </select>
          </label>
        </div>

        {marketRows.length === 0 ? (
          <EmptyState title="Nessun giocatore trovato" text="Modifica filtri o ricerca per vedere altri asset virtuali." />
        ) : (
          <div className="player-card-grid market-card-grid">
            {marketRows.map(row => {
              const action = actionForRow(row);
              const card = marketRowToCard(row);
              return (
                <PlayerCard
                  key={row.id}
                  player={card}
                  compact
                  onSelect={setSelectedPlayer}
                  onAction={() => action.onClick()}
                />
              );
            })}
          </div>
        )}
        <div className="table-note">
          Buy/sell restano mock o disabilitati in read-only backend. Nessun ordine reale e nessun pagamento reale.
        </div>
      </Section>

      <Section title="Storico operazioni">
        <div className="card table-scroll">
          <table>
            <thead>
              <tr>
                <th>Round</th>
                <th>Tipo</th>
                <th>Giocatore</th>
                <th>Gross amount</th>
                <th>Commissione</th>
                <th>Net amount</th>
                <th>Capital added</th>
                <th>Cash before</th>
                <th>Cash after</th>
              </tr>
            </thead>
            <tbody>
              {lastOperations.map(operation => (
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
          <div className="table-note">
            Il buy successivo usa prima il cash virtuale; solo l'eventuale deficit aumenta totalCapitalDeposited.
          </div>
        </div>
      </Section>

      <Section title="Settlement finale virtuale">
        <div className="favc-settlement-grid">
          <div className="card">
            <div className="doc-title">Formula</div>
            <div className="settlement-formula">
              <div><span>Valore rosa lordo</span><strong>{formatCredits(currentPortfolioValue)}</strong></div>
              <div><span>Net liquidation value</span><strong>{formatCredits(netLiquidationValue)}</strong></div>
              <div><span>Cash virtuale</span><strong>{formatCredits(virtualCashBalance)}</strong></div>
              <div><span>Final liquidation value</span><strong>{formatCredits(finalLiquidationValue)}</strong></div>
              <div><span>Profit/Loss</span><strong className={valueTone(profitLoss)}>{formatSignedCredits(profitLoss)}</strong></div>
              <div><span>ROI%</span><strong className={valueTone(roiPct)}>{formatSignedPercent(roiPct)}</strong></div>
            </div>
            <div className="table-note">
              finalLiquidationValue = netLiquidationValue + virtualCashBalance. Il ROI non viene aggiunto una seconda volta.
            </div>
          </div>

          <div className="notice-card settlement-notice">
            <span className="badge badge-amber">Pilot virtuale</span>
            <strong>Nessun payout reale nel pilot</strong>
            <p>
              Il credito virtuale non rappresenta denaro reale. Il modello riscattabile e stato analizzato come variante separata,
              ma non e incluso in questa versione.
            </p>
          </div>
        </div>
      </Section>

      {selectedPlayer && (
        <div className="player-drawer-backdrop" onClick={() => setSelectedPlayer(null)}>
          <aside className="player-drawer" onClick={event => event.stopPropagation()}>
            <button className="drawer-close" type="button" onClick={() => setSelectedPlayer(null)}>Chiudi</button>
            <div className="drawer-header">
              <span className="role-badge">{selectedPlayer.role}</span>
              <h2>{selectedPlayer.playerName}</h2>
              <p>{selectedPlayer.realTeam}</p>
            </div>

            <PlayerTrendChart data={selectedPlayer.trend} mode="full" valueKey="quote" />

            <div className="card table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Quote</th>
                    <th>Quote change</th>
                    <th>FT return</th>
                    <th>Vote</th>
                    <th>Bonus/malus</th>
                    <th>Estimated value</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPlayer.trend.map(point => (
                    <tr key={point.round}>
                      <td>G{point.round}</td>
                      <td>{formatCredits(point.quote)}</td>
                      <td className={valueTone(point.quoteChange)}>{formatSignedCredits(point.quoteChange)}</td>
                      <td className={valueTone(point.fantaTradingReturnPct)}>{formatSignedPercent(point.fantaTradingReturnPct)}</td>
                      <td>{point.vote ?? 'n.d.'}</td>
                      <td className={valueTone(point.fantasyBonusPct ?? 0)}>{formatSignedPercent(point.fantasyBonusPct ?? 0)}</td>
                      <td>{formatCredits(point.estimatedValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="table-note">
                Andamento stimato nel pilot, non quotazione ufficiale Fantacalcio round-by-round. Quando saranno disponibili dati ufficiali giornata per giornata, questa vista potra usare quelli.
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
