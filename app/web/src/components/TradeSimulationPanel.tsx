import { useMemo, useState } from 'react';
import type { DemoMarketPlayer, DemoPosition } from '../mock/favcDemoData';
import { simulateTradeChange } from '../utils/tradeSimulation';
import { formatCredits, formatSignedPercent, valueTone } from '../utils/format';

type Props = {
  positions: DemoPosition[];
  marketPlayers: DemoMarketPlayer[];
  virtualCashBalance: number;
  totalCapitalDeposited: number;
  currentPortfolioValue: number;
};

export default function TradeSimulationPanel({
  positions,
  marketPlayers,
  virtualCashBalance,
  totalCapitalDeposited,
  currentPortfolioValue,
}: Props) {
  const activePositions = positions.filter(position => position.status === 'ACTIVE');
  const [sellId, setSellId] = useState(activePositions[0]?.id ?? '');
  const [buyId, setBuyId] = useState(marketPlayers[0]?.id ?? '');

  const result = useMemo(() => {
    const sellPosition = activePositions.find(position => position.id === sellId);
    const buyPlayer = marketPlayers.find(player => player.id === buyId);
    if (!sellPosition || !buyPlayer) return null;
    return simulateTradeChange(sellPosition, buyPlayer, {
      virtualCashBalance,
      totalCapitalDeposited,
      currentPortfolioValue,
    });
  }, [activePositions, buyId, currentPortfolioValue, marketPlayers, sellId, totalCapitalDeposited, virtualCashBalance]);

  return (
    <div className="card trade-simulation">
      <div className="trade-simulation-header">
        <div>
          <div className="doc-title">Simula cambio</div>
          <p>Questa e una simulazione locale. Non modifica il team demo nel database.</p>
        </div>
        <span className="badge badge-amber">Simulazione</span>
      </div>

      <div className="trade-select-grid">
        <label>
          Vendi dalla rosa
          <select value={sellId} onChange={event => setSellId(event.target.value)}>
            {activePositions.map(position => (
              <option value={position.id} key={position.id}>{position.playerName} - {position.realTeam}</option>
            ))}
          </select>
        </label>
        <label>
          Compra dal mercato
          <select value={buyId} onChange={event => setBuyId(event.target.value)}>
            {marketPlayers.map(player => (
              <option value={player.id} key={player.id}>{player.playerName} - {player.realTeam}</option>
            ))}
          </select>
        </label>
      </div>

      {result && (
        <div className="simulation-grid">
          <div><span>Valore lordo vendita</span><strong>{formatCredits(result.sellGrossValue)}</strong></div>
          <div><span>Sell fee</span><strong>{formatCredits(result.sellFee)}</strong></div>
          <div><span>Incasso netto</span><strong>{formatCredits(result.sellNetProceeds)}</strong></div>
          <div><span>Costo acquisto</span><strong>{formatCredits(result.buyGrossCost)}</strong></div>
          <div><span>Buy fee</span><strong>{formatCredits(result.buyFee)}</strong></div>
          <div><span>Capital added</span><strong>{formatCredits(result.capitalAdded)}</strong></div>
          <div><span>Cash dopo cambio</span><strong>{formatCredits(result.cashAfterBuy)}</strong></div>
          <div><span>ROI stimato</span><strong className={valueTone(result.estimatedRoiPctAfter)}>{formatSignedPercent(result.estimatedRoiPctAfter)}</strong></div>
        </div>
      )}
    </div>
  );
}
