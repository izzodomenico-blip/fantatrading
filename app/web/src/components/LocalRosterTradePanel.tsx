import { useMemo, useState } from 'react';
import { type DemoMarketPlayer } from '../mock/favcDemoData';
import {
  buildLocalRosterStateAtRound,
  computeBuyTrade,
  computeSellTrade,
  type LocalRoster,
  type LocalRosterTrade,
} from '../utils/localRosters';
import { formatCredits } from '../utils/format';
import type { PlayerRoundMemory } from '../utils/playerRoundMemory';
import { getPlayerRoundSnapshot } from '../utils/playerRoundMemory';

type Props = {
  roster: LocalRoster;
  round: number;
  marketPlayers: DemoMarketPlayer[];
  roundMemory: Map<string, PlayerRoundMemory>;
  onUpdated: (next: LocalRoster) => void;
};

type TradeDraft =
  | { kind: 'sell'; playerId: string }
  | { kind: 'buy'; playerId: string }
  | null;

export default function LocalRosterTradePanel({ roster, round, marketPlayers, roundMemory, onUpdated }: Props) {
  const [draft, setDraft] = useState<TradeDraft>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);

  const { positions: positionStates, financials } = useMemo(() => buildLocalRosterStateAtRound(roster, round), [roster, round]);
  const activePositions = positionStates.filter(position => position.status === 'ACTIVE');
  const heldIds = new Set(positionStates.map(position => position.playerId));

  function quoteForPlayerAtRound(playerId: string, fallback: number) {
    const memory = roundMemory.get(playerId);
    if (!memory) return fallback;
    const point = getPlayerRoundSnapshot(memory, round);
    return point?.quote ?? fallback;
  }

  const buyableMarket = useMemo(() => {
    return marketPlayers
      .filter(player => {
        const id = player.playerId ?? player.id;
        return !heldIds.has(id);
      })
      .slice(0, 40);
  }, [marketPlayers, heldIds]);

  const draftSell = draft?.kind === 'sell' ? activePositions.find(p => p.playerId === draft.playerId) : null;
  const draftBuy = draft?.kind === 'buy' ? buyableMarket.find(player => (player.playerId ?? player.id) === draft.playerId) : null;

  const sellPreview = useMemo(() => {
    if (!draftSell) return null;
    const quote = quoteForPlayerAtRound(draftSell.playerId, draftSell.initialQuote);
    return {
      ...computeSellTrade({ cashBefore: financials.cashBalance, quote }),
      quote,
    };
  }, [draftSell, financials.cashBalance, round, roundMemory]);

  const buyPreview = useMemo(() => {
    if (!draftBuy) return null;
    const playerId = draftBuy.playerId ?? draftBuy.id;
    const quote = quoteForPlayerAtRound(playerId, draftBuy.quote);
    return {
      ...computeBuyTrade({ cashBefore: financials.cashBalance, quote }),
      quote,
    };
  }, [draftBuy, financials.cashBalance, round, roundMemory]);

  function executeSell() {
    if (!draftSell || !sellPreview) return;
    const trade: LocalRosterTrade = {
      id: `trade-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      round,
      type: 'SELL',
      playerId: draftSell.playerId,
      backendPlayerId: draftSell.backendPlayerId,
      playerName: draftSell.playerName,
      realTeam: draftSell.realTeam,
      role: draftSell.role,
      quoteAtTrade: sellPreview.quote,
      grossAmount: sellPreview.grossAmount,
      commission: sellPreview.commission,
      netAmount: sellPreview.netAmount,
      cashBefore: financials.cashBalance,
      cashAfter: sellPreview.cashAfter,
      capitalAdded: 0,
      createdAt: new Date().toISOString(),
    };
    const next: LocalRoster = {
      ...roster,
      trades: [...roster.trades, trade],
      updatedAt: new Date().toISOString(),
    };
    onUpdated(next);
    setDraft(null);
    setMessage({
      tone: 'success',
      text: `Venduto ${trade.playerName} a quota ${sellPreview.quote.toFixed(0)} (+${formatCredits(sellPreview.netAmount)} cash). Commissione ${formatCredits(sellPreview.commission)}.`,
    });
  }

  function executeBuy() {
    if (!draftBuy || !buyPreview) return;
    const playerId = draftBuy.playerId ?? draftBuy.id;
    const trade: LocalRosterTrade = {
      id: `trade-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      round,
      type: 'BUY',
      playerId,
      backendPlayerId: draftBuy.id,
      playerName: draftBuy.playerName,
      realTeam: draftBuy.realTeam,
      role: draftBuy.role,
      quoteAtTrade: buyPreview.quote,
      grossAmount: buyPreview.grossAmount,
      commission: buyPreview.commission,
      netAmount: buyPreview.netAmount,
      cashBefore: financials.cashBalance,
      cashAfter: buyPreview.cashAfter,
      capitalAdded: buyPreview.capitalAdded,
      createdAt: new Date().toISOString(),
    };
    const next: LocalRoster = {
      ...roster,
      trades: [...roster.trades, trade],
      updatedAt: new Date().toISOString(),
    };
    onUpdated(next);
    setDraft(null);
    setMessage({
      tone: 'success',
      text: `Acquistato ${trade.playerName} a quota ${buyPreview.quote.toFixed(0)} (-${formatCredits(buyPreview.netAmount)} cash). Commissione ${formatCredits(buyPreview.commission)}.${buyPreview.capitalAdded > 0 ? ` Capitale extra ${formatCredits(buyPreview.capitalAdded)}.` : ''}`,
    });
  }

  function removeTrade(tradeId: string) {
    const next: LocalRoster = {
      ...roster,
      trades: roster.trades.filter(trade => trade.id !== tradeId),
      updatedAt: new Date().toISOString(),
    };
    onUpdated(next);
    setMessage({ tone: 'info', text: 'Operazione rimossa: bilancio ricalcolato.' });
  }

  const tradesAtThisRound = roster.trades.filter(trade => trade.round === round);

  return (
    <div className="trade-round-panel card">
      <div className="trade-round-header">
        <div>
          <span className="sim-info-eyebrow">Simula operazioni in G{round}</span>
          <h3>Compra e vendi - {roster.name}</h3>
          <p>Le operazioni sono solo locali. Aggiornano cash, valore rosa e guadagno %. Nessun pagamento reale.</p>
        </div>
        <div className="trade-round-cash">
          <span className="sim-info-eyebrow">Cash disponibile</span>
          <strong>{formatCredits(financials.cashBalance)}</strong>
        </div>
      </div>

      <div className="trade-round-grid">
        <div className="trade-round-side trade-round-side-sell">
          <h4>Vendi un giocatore</h4>
          <select
            value={draft?.kind === 'sell' ? draft.playerId : ''}
            onChange={event => setDraft(event.target.value ? { kind: 'sell', playerId: event.target.value } : null)}
          >
            <option value="">Seleziona dalla rosa attiva</option>
            {activePositions.map(position => {
              const quote = quoteForPlayerAtRound(position.playerId, position.initialQuote);
              return (
                <option key={position.playerId} value={position.playerId}>
                  {position.playerName} ({position.role}) - quota G{round} {quote.toFixed(0)}
                </option>
              );
            })}
          </select>
          {sellPreview && draftSell && (
            <div className="trade-round-preview">
              <div><span>Quota G{round}</span><strong>{formatCredits(sellPreview.quote)}</strong></div>
              <div><span>Lordo vendita</span><strong>{formatCredits(sellPreview.grossAmount)}</strong></div>
              <div><span>Commissione 1.25%</span><strong>{formatCredits(sellPreview.commission)}</strong></div>
              <div><span>Netto incassato</span><strong className="positive">+{formatCredits(sellPreview.netAmount)}</strong></div>
              <div><span>Cash dopo</span><strong>{formatCredits(sellPreview.cashAfter)}</strong></div>
              <button type="button" className="button button-secondary trade-round-confirm" onClick={executeSell}>Vendi {draftSell.playerName}</button>
            </div>
          )}
        </div>

        <div className="trade-round-side trade-round-side-buy">
          <h4>Compra un giocatore</h4>
          <select
            value={draft?.kind === 'buy' ? draft.playerId : ''}
            onChange={event => setDraft(event.target.value ? { kind: 'buy', playerId: event.target.value } : null)}
          >
            <option value="">Seleziona dal mercato</option>
            {buyableMarket.map(player => {
              const id = player.playerId ?? player.id;
              const quote = quoteForPlayerAtRound(id, player.quote);
              return (
                <option key={id} value={id}>
                  {player.playerName} ({player.role}) - quota G{round} {quote.toFixed(0)}
                </option>
              );
            })}
          </select>
          {buyPreview && draftBuy && (
            <div className="trade-round-preview">
              <div><span>Quota G{round}</span><strong>{formatCredits(buyPreview.quote)}</strong></div>
              <div><span>Commissione 2%</span><strong>{formatCredits(buyPreview.commission)}</strong></div>
              <div><span>Costo totale</span><strong className="negative">-{formatCredits(buyPreview.netAmount)}</strong></div>
              {buyPreview.capitalAdded > 0 && (
                <div><span>Capitale extra</span><strong>{formatCredits(buyPreview.capitalAdded)}</strong></div>
              )}
              <div><span>Cash dopo</span><strong>{formatCredits(buyPreview.cashAfter)}</strong></div>
              <button type="button" className="button button-primary trade-round-confirm" onClick={executeBuy}>Compra {draftBuy.playerName}</button>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className={`trade-round-message trade-status trade-status-${message.tone}`}>
          <strong>{message.tone === 'success' ? 'Operazione registrata' : message.tone === 'error' ? 'Errore' : 'Info'}</strong>
          <span>{message.text}</span>
        </div>
      )}

      {tradesAtThisRound.length > 0 && (
        <div className="trade-round-log">
          <div className="sim-info-eyebrow">Operazioni in G{round}</div>
          <table className="compact-table">
            <thead>
              <tr><th>Tipo</th><th>Giocatore</th><th>Quota</th><th>Comm.</th><th>Cash dopo</th><th></th></tr>
            </thead>
            <tbody>
              {tradesAtThisRound.map(trade => (
                <tr key={trade.id}>
                  <td><span className={`badge ${trade.type === 'BUY' ? 'badge-blue' : 'badge-amber'}`}>{trade.type}</span></td>
                  <td><strong>{trade.playerName}</strong><span className="table-subline">{trade.realTeam} · {trade.role}</span></td>
                  <td>{formatCredits(trade.quoteAtTrade)}</td>
                  <td>{formatCredits(trade.commission)}</td>
                  <td>{formatCredits(trade.cashAfter)}</td>
                  <td><button type="button" className="favc-action muted" onClick={() => removeTrade(trade.id)}>Annulla</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
