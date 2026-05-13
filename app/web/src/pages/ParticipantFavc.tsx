import { useMemo, useState } from 'react';
import { MetricCard, Section, pct } from '../components';

type Role = 'P' | 'D' | 'C' | 'A';
type PositionStatus = 'ACTIVE' | 'SOLD';
type OperationType = 'BUY' | 'SELL';

type Position = {
  id: string;
  playerName: string;
  role: Role;
  initialQuote: number;
  currentQuote: number;
  fantasyMultiplier: number;
  status: PositionStatus;
};

type MarketPlayer = {
  id: string;
  playerName: string;
  role: Role;
  quote: number;
  available: boolean;
};

type MarketOperation = {
  id: string;
  type: OperationType;
  playerName: string;
  grossAmount: number;
  commission: number;
  netAmount: number;
  capitalAdded: number;
  cashBefore: number;
  cashAfter: number;
};

const BUY_COMMISSION_RATE = 0.02;
const SELL_COMMISSION_RATE = 0.02;

const ROLE_LIMITS: Record<Role, number> = {
  P: 3,
  D: 8,
  C: 8,
  A: 6,
};

const ROLE_LABELS: Record<Role, string> = {
  P: 'Portiere',
  D: 'Difensore',
  C: 'Centrocampista',
  A: 'Attaccante',
};

const money = (value: number, digits = 2) =>
  value.toLocaleString('it-IT', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

function buyCommission(grossAmount: number) {
  return grossAmount * BUY_COMMISSION_RATE;
}

function sellCommission(grossAmount: number) {
  return grossAmount * SELL_COMMISSION_RATE;
}

function currentPositionValue(position: Position) {
  if (position.status === 'SOLD') return 0;
  const quoteStepReturnPct = (position.currentQuote - position.initialQuote) * 5;
  return Math.max(0, position.initialQuote * position.fantasyMultiplier * (1 + quoteStepReturnPct / 100));
}

function makePlayers(prefix: string, role: Role, count: number, initialQuote = 6, currentQuote = 10): Position[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${role}-${index + 1}`,
    playerName: `${ROLE_LABELS[role]} ${prefix.toUpperCase()} ${index + 1}`,
    role,
    initialQuote,
    currentQuote,
    fantasyMultiplier: 1,
    status: 'ACTIVE' as PositionStatus,
  }));
}

function createInitialPositions(): Position[] {
  const soldStarter: Position = {
    id: 'sold-p-1',
    playerName: 'Portiere A 1',
    role: 'P',
    initialQuote: 6,
    currentQuote: 6,
    fantasyMultiplier: 1,
    status: 'SOLD',
  };

  const replacement: Position = {
    id: 'active-p-replacement',
    playerName: 'Portiere Backup',
    role: 'P',
    initialQuote: 6,
    currentQuote: 10,
    fantasyMultiplier: 1,
    status: 'ACTIVE',
  };

  return [
    soldStarter,
    ...makePlayers('a', 'P', 2),
    replacement,
    ...makePlayers('a', 'D', 8),
    ...makePlayers('a', 'C', 8),
    ...makePlayers('a', 'A', 6),
  ];
}

function createInitialOperations(): MarketOperation[] {
  const initialBuys = [
    'Portiere A 1',
    'Portiere A 2',
    'Portiere A 3',
    ...Array.from({ length: 8 }, (_, index) => `Difensore A ${index + 1}`),
    ...Array.from({ length: 8 }, (_, index) => `Centrocampista A ${index + 1}`),
    ...Array.from({ length: 6 }, (_, index) => `Attaccante A ${index + 1}`),
  ];

  const buys = initialBuys.map((playerName, index) => {
    const grossAmount = 6;
    const commission = buyCommission(grossAmount);
    return {
      id: `op-buy-${index + 1}`,
      type: 'BUY' as OperationType,
      playerName,
      grossAmount,
      commission,
      netAmount: grossAmount + commission,
      capitalAdded: grossAmount + commission,
      cashBefore: 0,
      cashAfter: 0,
    };
  });

  return [
    ...buys,
    {
      id: 'op-sell-starter',
      type: 'SELL',
      playerName: 'Portiere A 1',
      grossAmount: 6,
      commission: sellCommission(6),
      netAmount: 6 - sellCommission(6),
      capitalAdded: 0,
      cashBefore: 0,
      cashAfter: 6 - sellCommission(6),
    },
    {
      id: 'op-buy-replacement',
      type: 'BUY',
      playerName: 'Portiere Backup',
      grossAmount: 6,
      commission: buyCommission(6),
      netAmount: 6 + buyCommission(6),
      capitalAdded: buyCommission(6) + sellCommission(6),
      cashBefore: 6 - sellCommission(6),
      cashAfter: 0,
    },
  ];
}

const initialMarketPlayers: MarketPlayer[] = [
  { id: 'market-p-1', playerName: 'Portiere Value', role: 'P', quote: 7, available: true },
  { id: 'market-d-1', playerName: 'Difensore Breakout', role: 'D', quote: 9, available: true },
  { id: 'market-c-1', playerName: 'Centrocampista Regista', role: 'C', quote: 11, available: true },
  { id: 'market-a-1', playerName: 'Attaccante Momentum', role: 'A', quote: 14, available: true },
];

function operationClass(type: OperationType) {
  return type === 'BUY' ? 'badge badge-blue' : 'badge badge-amber';
}

function statusClass(status: PositionStatus) {
  return status === 'ACTIVE' ? 'badge badge-green' : 'badge badge-red';
}

export default function ParticipantFavc() {
  const [positions, setPositions] = useState<Position[]>(() => createInitialPositions());
  const [marketPlayers, setMarketPlayers] = useState<MarketPlayer[]>(initialMarketPlayers);
  const [operations, setOperations] = useState<MarketOperation[]>(() => createInitialOperations());
  const [virtualCashBalance, setVirtualCashBalance] = useState(0);

  const activePositions = useMemo(
    () => positions.filter(position => position.status === 'ACTIVE'),
    [positions],
  );

  const activeRoleCounts = useMemo(() => {
    return activePositions.reduce(
      (counts, position) => ({ ...counts, [position.role]: counts[position.role] + 1 }),
      { P: 0, D: 0, C: 0, A: 0 } as Record<Role, number>,
    );
  }, [activePositions]);

  const totalCapitalDeposited = useMemo(
    () => operations.reduce((sum, operation) => sum + operation.capitalAdded, 0),
    [operations],
  );

  const currentPortfolioValue = useMemo(
    () => activePositions.reduce((sum, position) => sum + currentPositionValue(position), 0),
    [activePositions],
  );

  const netLiquidationValue = currentPortfolioValue * (1 - SELL_COMMISSION_RATE);
  const finalLiquidationValue = netLiquidationValue + virtualCashBalance;
  const profitLoss = finalLiquidationValue - totalCapitalDeposited;
  const roiPct = totalCapitalDeposited > 0 ? (profitLoss / totalCapitalDeposited) * 100 : 0;

  const rankingRows = useMemo(() => {
    const betaDeposited = 600 * (1 + BUY_COMMISSION_RATE);
    const betaNet = 660 * (1 - SELL_COMMISSION_RATE);
    const rows = [
      { team: 'Team Alpha demo', totalWealth: finalLiquidationValue, roiPct },
      { team: 'Team Beta 600->660', totalWealth: betaNet, roiPct: ((betaNet - betaDeposited) / betaDeposited) * 100 },
      { team: 'Team Gamma cash-heavy', totalWealth: 205, roiPct: 4.1 },
    ].sort((a, b) => b.roiPct - a.roiPct);

    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
  }, [finalLiquidationValue, roiPct]);

  const currentRank = rankingRows.find(row => row.team === 'Team Alpha demo')?.rank ?? 0;
  const lastOperations = operations.slice(-12).reverse();
  const availableMarketPlayers = marketPlayers.filter(player => player.available);
  const sellablePositions = activePositions.slice(0, 4);

  function addOperation(operation: Omit<MarketOperation, 'id'>) {
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

    const grossAmount = currentPositionValue(position);
    const commission = sellCommission(grossAmount);
    const netAmount = grossAmount - commission;
    const cashBefore = virtualCashBalance;
    const cashAfter = cashBefore + netAmount;

    setPositions(current =>
      current.map(item => item.id === positionId ? { ...item, status: 'SOLD' } : item),
    );
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
    });
  }

  function buyPlayer(playerId: string) {
    const player = marketPlayers.find(item => item.id === playerId && item.available);
    if (!player) return;

    const canBuy = activeRoleCounts[player.role] < ROLE_LIMITS[player.role];
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
    });
  }

  return (
    <>
      <div className="page-title">Partecipante FAVC</div>
      <div className="page-sub">
        Demo locale del pilot FREE_ACCESS_VARIABLE_CAPITAL: accesso libero, capitale virtuale variabile, settlement virtuale.
      </div>

      <div className="favc-banner">
        <div>
          <strong>Fixture mock attiva.</strong> La pagina resta utilizzabile anche senza API backend collegate.
        </div>
        <span className="badge badge-green">nessun payout reale</span>
      </div>

      <Section title="Dashboard Partecipante">
        <div className="metric-grid favc-metric-grid">
          <MetricCard label="Capitale depositato" value={money(totalCapitalDeposited)} sub="totalCapitalDeposited" color="var(--teal)" />
          <MetricCard label="Cash virtuale" value={money(virtualCashBalance)} sub="virtualCashBalance" color="var(--green)" />
          <MetricCard label="Net liquidation" value={money(netLiquidationValue)} sub="dopo commissione vendita" color="var(--accent)" />
          <MetricCard label="Final liquidation" value={money(finalLiquidationValue)} sub="netLiquidation + cash" color="var(--purple)" />
          <MetricCard label="Profit / loss" value={money(profitLoss)} sub="valore finale - capitale" color={profitLoss >= 0 ? 'var(--green)' : 'var(--red)'} />
          <MetricCard label="ROI" value={pct(roiPct, 2)} sub="ranking principale" color={roiPct >= 0 ? 'var(--green)' : 'var(--red)'} />
          <MetricCard label="Ranking ROI" value={`#${currentRank}`} sub={`${rankingRows.length} team demo`} color="var(--amber)" />
          <MetricCard label="Rosa attiva" value={`${activePositions.length}/25`} sub="3P / 8D / 8C / 6A" color="var(--accent)" />
        </div>
      </Section>

      <div className="two-col favc-two-col">
        <Section title="Ranking ROI%">
          <div className="card table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>ROI%</th>
                  <th>Valore finale</th>
                </tr>
              </thead>
              <tbody>
                {rankingRows.map(row => (
                  <tr key={row.team} className={row.team === 'Team Alpha demo' ? 'rec-row' : undefined}>
                    <td><strong>#{row.rank}</strong></td>
                    <td>{row.team}</td>
                    <td>{pct(row.roiPct, 2)}</td>
                    <td>{money(row.totalWealth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-note">
              Il team 150-&gt;180 batte il team 600-&gt;660 per ROI%, anche se il secondo ha valore assoluto piu alto.
            </div>
          </div>
        </Section>

        <Section title="Composizione rosa">
          <div className="card">
            <div className="favc-role-grid">
              {(Object.keys(ROLE_LIMITS) as Role[]).map(role => (
                <div key={role} className="favc-role-cell">
                  <span>{role}</span>
                  <strong>{activeRoleCounts[role]}/{ROLE_LIMITS[role]}</strong>
                </div>
              ))}
            </div>
            <div className="table-note">
              La demo parte da una rosa completa. Una vendita libera uno slot, un acquisto usa prima il cash virtuale e aggiunge capitale solo sul deficit.
            </div>
          </div>
        </Section>
      </div>

      <Section title="Portafoglio">
        <div className="card table-scroll">
          <table>
            <thead>
              <tr>
                <th>Giocatore</th>
                <th>Ruolo</th>
                <th>Qt. iniziale</th>
                <th>Qt. corrente</th>
                <th>Valore corrente</th>
                <th>Multiplier</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(position => (
                <tr key={position.id}>
                  <td><strong>{position.playerName}</strong></td>
                  <td>{position.role}</td>
                  <td>{money(position.initialQuote)}</td>
                  <td>{money(position.currentQuote)}</td>
                  <td>{money(currentPositionValue(position))}</td>
                  <td>{position.fantasyMultiplier.toFixed(2)}</td>
                  <td><span className={statusClass(position.status)}>{position.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-note">
            Sono presenti 25 giocatori ACTIVE e una posizione SOLD storica per rendere visibile il ciclo buy/sell.
          </div>
        </div>
      </Section>

      <Section title="Mercato demo">
        <div className="favc-market-grid">
          <div className="card table-scroll">
            <div className="doc-title">ACQUISTI MOCK</div>
            <table>
              <thead>
                <tr>
                  <th>Giocatore</th>
                  <th>Ruolo</th>
                  <th>Quota</th>
                  <th>Comm.</th>
                  <th>Capital added</th>
                  <th>Azione</th>
                </tr>
              </thead>
              <tbody>
                {availableMarketPlayers.map(player => {
                  const commission = buyCommission(player.quote);
                  const netAmount = player.quote + commission;
                  const capitalAdded = Math.max(0, netAmount - virtualCashBalance);
                  const canBuy = activeRoleCounts[player.role] < ROLE_LIMITS[player.role];

                  return (
                    <tr key={player.id}>
                      <td><strong>{player.playerName}</strong></td>
                      <td>{player.role}</td>
                      <td>{money(player.quote)}</td>
                      <td>{money(commission)}</td>
                      <td>{money(capitalAdded)}</td>
                      <td>
                        <button
                          className="favc-action"
                          type="button"
                          onClick={() => buyPlayer(player.id)}
                          disabled={!canBuy}
                        >
                          {canBuy ? 'Buy' : 'Slot pieno'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="table-note">
              Ogni BUY scala prima il cash virtuale. Solo la parte mancante aumenta il capitale virtuale depositato.
            </div>
          </div>

          <div className="card table-scroll">
            <div className="doc-title">VENDITE MOCK</div>
            <table>
              <thead>
                <tr>
                  <th>Giocatore</th>
                  <th>Ruolo</th>
                  <th>Gross</th>
                  <th>Comm.</th>
                  <th>Cash after</th>
                  <th>Azione</th>
                </tr>
              </thead>
              <tbody>
                {sellablePositions.map(position => {
                  const grossAmount = currentPositionValue(position);
                  const commission = sellCommission(grossAmount);
                  const cashAfter = virtualCashBalance + grossAmount - commission;

                  return (
                    <tr key={position.id}>
                      <td><strong>{position.playerName}</strong></td>
                      <td>{position.role}</td>
                      <td>{money(grossAmount)}</td>
                      <td>{money(commission)}</td>
                      <td>{money(cashAfter)}</td>
                      <td>
                        <button className="favc-action favc-action-sell" type="button" onClick={() => sellPosition(position.id)}>
                          Sell
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="table-note">
              Ogni SELL aumenta il cash virtuale del netto vendita. La commissione resta al sistema.
            </div>
          </div>
        </div>
      </Section>

      <Section title="Storico operazioni">
        <div className="card table-scroll">
          <table>
            <thead>
              <tr>
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
                  <td><span className={operationClass(operation.type)}>{operation.type}</span></td>
                  <td><strong>{operation.playerName}</strong></td>
                  <td>{money(operation.grossAmount)}</td>
                  <td>{money(operation.commission)}</td>
                  <td>{money(operation.netAmount)}</td>
                  <td>{money(operation.capitalAdded)}</td>
                  <td>{money(operation.cashBefore)}</td>
                  <td>{money(operation.cashAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-note">
            Mostrate le ultime 12 operazioni. Le commissioni BUY/SELL sono trattenute dal sistema; la demo non crea pagamenti reali.
          </div>
        </div>
      </Section>

      <Section title="Settlement finale">
        <div className="favc-settlement-grid">
          <div className="card">
            <div className="doc-title">FORMULA SETTLEMENT VIRTUALE</div>
            <div className="config-box">
              <div><span className="config-key">netLiquidationValue:   </span><span className="config-val">{money(currentPortfolioValue)} x 98% = {money(netLiquidationValue)}</span></div>
              <div><span className="config-key">virtualCashBalance:    </span><span className="config-val">{money(virtualCashBalance)}</span></div>
              <div><span className="config-key">finalLiquidationValue: </span><span className="config-val">{money(netLiquidationValue)} + {money(virtualCashBalance)} = {money(finalLiquidationValue)}</span></div>
              <div><span className="config-key">profitLoss:            </span><span className="config-val">{money(finalLiquidationValue)} - {money(totalCapitalDeposited)} = {money(profitLoss)}</span></div>
              <div><span className="config-key">roiPct:                </span><span className="config-val">{pct(roiPct, 2)}</span></div>
            </div>
          </div>

          <div className="card">
            <div className="doc-title">CONTROLLI FAVC</div>
            <div className="favc-check-list">
              <div><span className="badge badge-green">OK</span><strong>Nessun budget massimo</strong></div>
              <div><span className="badge badge-green">OK</span><strong>Il capitale cresce solo se il cash non basta</strong></div>
              <div><span className="badge badge-green">OK</span><strong>finalLiquidationValue = netLiquidationValue + virtualCashBalance</strong></div>
              <div><span className="badge badge-green">OK</span><strong>ROI% non viene aggiunto una seconda volta</strong></div>
              <div><span className="badge badge-amber">Pilot</span><strong>Nessun payout reale</strong></div>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
