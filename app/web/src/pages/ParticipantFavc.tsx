import { useMemo, useState } from 'react';
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
import { EmptyState, MetricCard, Section, StatusBadges } from '../components';
import {
  BUY_COMMISSION_RATE,
  SELL_COMMISSION_RATE,
  calculatePositionValue,
  demoTeams,
  initialMarketPlayers,
  initialOperations,
  initialPositions,
  portfolioHistory,
  rankingExample,
  roleLimits,
  roleNames,
  type DemoMarketPlayer,
  type DemoOperation,
  type DemoPosition,
  type FavcRole,
  type OperationType,
} from '../mock/favcDemoData';
import { AXIS_STYLE, COLORS, GRID_STYLE, TOOLTIP_STYLE } from '../data';
import { formatCredits, formatPercent, formatSignedCredits, formatSignedPercent, valueTone } from '../utils/format';

type PriceFilter = 'all' | 'low' | 'mid' | 'high';
type PerformanceFilter = 'all' | 'positive' | 'negative';

type MarketRow = {
  id: string;
  playerName: string;
  realTeam: string;
  role: FavcRole;
  quote: number;
  trendPct: number;
  performancePct: number;
  mode: 'BUY' | 'SELL';
  positionId?: string;
  available?: boolean;
};

function buyCommission(grossAmount: number) {
  return grossAmount * BUY_COMMISSION_RATE;
}

function sellCommission(grossAmount: number) {
  return grossAmount * SELL_COMMISSION_RATE;
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

function marketValue(player: Pick<DemoMarketPlayer, 'quote' | 'trendPct'>) {
  return player.quote * (1 + player.trendPct / 100);
}

export default function ParticipantFavc() {
  const [positions, setPositions] = useState<DemoPosition[]>(() => initialPositions);
  const [marketPlayers, setMarketPlayers] = useState<DemoMarketPlayer[]>(() => initialMarketPlayers);
  const [operations, setOperations] = useState<DemoOperation[]>(() => initialOperations);
  const [virtualCashBalance, setVirtualCashBalance] = useState(0);
  const [roleFilter, setRoleFilter] = useState<FavcRole | 'all'>('all');
  const [teamFilter, setTeamFilter] = useState('Tutte');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [performanceFilter, setPerformanceFilter] = useState<PerformanceFilter>('all');
  const [search, setSearch] = useState('');

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
      label: 'Live',
      portfolioValue: Number(currentPortfolioValue.toFixed(2)),
      roiPct: Number(roiPct.toFixed(2)),
    };
    return [...portfolioHistory.slice(0, -1), today];
  }, [currentPortfolioValue, roiPct]);

  const rankingRows = useMemo(() => {
    const liveRow = {
      rank: 0,
      team: 'Alpha demo live',
      totalCapitalDeposited: Number(totalCapitalDeposited.toFixed(2)),
      finalValue: Number(finalLiquidationValue.toFixed(2)),
      profitLoss: Number(profitLoss.toFixed(2)),
      roiPct: Number(roiPct.toFixed(2)),
    };

    return [liveRow, ...rankingExample]
      .sort((a, b) => b.roiPct - a.roiPct)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [finalLiquidationValue, profitLoss, roiPct, totalCapitalDeposited]);

  const liveRank = rankingRows.find(row => row.team === 'Alpha demo live')?.rank ?? 0;

  const marketRows = useMemo<MarketRow[]>(() => {
    const ownedRows: MarketRow[] = activePositions.slice(0, 6).map(position => ({
      id: `owned-${position.id}`,
      playerName: position.playerName,
      realTeam: position.realTeam,
      role: position.role,
      quote: position.currentQuote,
      trendPct: getPositionRoi(position),
      performancePct: getPositionRoi(position) / 1.8,
      mode: 'SELL',
      positionId: position.id,
      available: true,
    }));

    const buyRows: MarketRow[] = marketPlayers.map(player => ({
      ...player,
      mode: 'BUY',
      available: player.available,
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

  const lastOperations = operations.slice(-10).reverse();

  function addOperation(operation: Omit<DemoOperation, 'id'>) {
    setOperations(current => [
      ...current,
      {
        ...operation,
        id: `op-${current.length + 1}`,
      },
    ]);
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
        playerName: player.playerName,
        realTeam: player.realTeam,
        role: player.role,
        initialQuote: player.quote,
        currentQuote: player.quote,
        fantasyMultiplier: 1,
        status: 'ACTIVE',
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
        disabled: false,
        commission,
        impact: virtualCashBalance + gross - commission,
        onClick: () => sellPosition(row.positionId as string),
      };
    }

    const commission = buyCommission(row.quote);
    const totalCost = row.quote + commission;
    const capitalAdded = Math.max(0, totalCost - virtualCashBalance);
    const canBuy = row.available && counts[row.role] < roleLimits[row.role];

    return {
      label: canBuy ? 'Compra' : row.available ? 'Slot pieno' : 'Gia preso',
      disabled: !canBuy,
      commission,
      impact: capitalAdded,
      onClick: () => buyPlayer(row.id),
    };
  }

  return (
    <>
      <div className="participant-hero">
        <div>
          <StatusBadges items={['Pilot virtuale', 'Nessun payout reale', 'Ranking ROI%']} />
          <h1>Alpha Trading Club</h1>
          <p>
            Dashboard demo partecipante FAVC. I crediti sono virtuali, il capitale non e denaro reale e il settlement e una chiusura contabile del pilot.
          </p>
        </div>
        <div className="participant-hero-panel">
          <span>ROI live</span>
          <strong>{formatSignedPercent(roiPct, 2)}</strong>
          <small>Ranking #{liveRank} per rendimento percentuale</small>
        </div>
      </div>

      <Section title="Dashboard Partecipante">
        <div className="metric-grid favc-metric-grid">
          <MetricCard label="Capitale virtuale depositato" value={formatCredits(totalCapitalDeposited)} sub="cresce solo quando il cash non basta" color="var(--teal)" />
          <MetricCard label="Valore rosa" value={formatCredits(currentPortfolioValue)} sub="25 giocatori attivi" color="var(--accent)" />
          <MetricCard label="Cash virtuale" value={formatCredits(virtualCashBalance)} sub="saldo disponibile mock" color="var(--green)" />
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
                  <tr key={row.team} className={row.team === 'Alpha demo live' || row.rank === 1 ? 'rec-row' : undefined}>
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

      <Section title="Portafoglio finanziario">
        <div className="card table-scroll">
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Giocatore</th>
                <th>Squadra</th>
                <th>Ruolo</th>
                <th>Qt. iniziale</th>
                <th>Qt. corrente</th>
                <th>Valore</th>
                <th>P/L</th>
                <th>ROI</th>
                <th>Multiplier</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(position => {
                const value = calculatePositionValue(position);
                const pl = getPositionPL(position);
                const singleRoi = getPositionRoi(position);
                return (
                  <tr key={position.id}>
                    <td><strong>{position.playerName}</strong></td>
                    <td>{position.realTeam}</td>
                    <td><span className="role-badge">{position.role}</span></td>
                    <td>{formatCredits(position.initialQuote)}</td>
                    <td>{formatCredits(position.currentQuote)}</td>
                    <td>{formatCredits(value)}</td>
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
              {demoTeams.map(team => <option value={team} key={team}>{team}</option>)}
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
            Rendimento
            <select value={performanceFilter} onChange={event => setPerformanceFilter(event.target.value as PerformanceFilter)}>
              <option value="all">Tutti</option>
              <option value="positive">positivo</option>
              <option value="negative">negativo</option>
            </select>
          </label>
        </div>

        <div className="card table-scroll">
          {marketRows.length === 0 ? (
            <EmptyState title="Nessun giocatore trovato" text="Modifica filtri o ricerca per vedere altri asset virtuali." />
          ) : (
            <table className="market-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Squadra</th>
                  <th>Ruolo</th>
                  <th>Quotazione</th>
                  <th>Trend</th>
                  <th>Valore azione</th>
                  <th>Commissione stimata</th>
                  <th>Impatto capitale/cash</th>
                  <th>Azione</th>
                </tr>
              </thead>
              <tbody>
                {marketRows.map(row => {
                  const action = actionForRow(row);
                  return (
                    <tr key={row.id}>
                      <td><strong>{row.playerName}</strong></td>
                      <td>{row.realTeam}</td>
                      <td><span className="role-badge">{row.role}</span></td>
                      <td>{formatCredits(row.quote)}</td>
                      <td className={valueTone(row.trendPct)}>{formatSignedPercent(row.trendPct, 1)}</td>
                      <td>{formatCredits(marketValue(row))}</td>
                      <td>{formatCredits(action.commission)}</td>
                      <td>{row.mode === 'BUY' ? `+${formatCredits(action.impact)} capitale` : `${formatCredits(action.impact)} cash after`}</td>
                      <td>
                        <button
                          className={`favc-action ${row.mode === 'SELL' ? 'favc-action-sell' : ''}`}
                          type="button"
                          disabled={action.disabled}
                          onClick={action.onClick}
                        >
                          {action.label}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className="table-note">
            Le azioni sono mock locali. Nessun ordine viene inviato al backend e nessun pagamento reale viene generato.
          </div>
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
    </>
  );
}
