import { useMemo, useState } from 'react';
import { type DemoMarketPlayer, type FavcRole, roleNames, SELL_COMMISSION_RATE, BUY_COMMISSION_RATE } from '../mock/favcDemoData';
import {
  buildLocalRosterStateAtRound,
  computeBuyTrade,
  computeSellTrade,
  type LocalRoster,
  type LocalRosterTrade,
} from '../utils/localRosters';
import { formatCredits, formatSignedCredits, formatSignedPercent, valueTone } from '../utils/format';
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

const ROLE_TONE: Record<FavcRole, 'amber' | 'blue' | 'purple' | 'red'> = {
  P: 'amber',
  D: 'blue',
  C: 'purple',
  A: 'red',
};

export default function LocalRosterTradePanel({ roster, round, marketPlayers, roundMemory, onUpdated }: Props) {
  const [draft, setDraft] = useState<TradeDraft>(null);
  const [roleFilter, setRoleFilter] = useState<FavcRole | 'all'>('all');
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

  const draftSell = draft?.kind === 'sell' ? activePositions.find(p => p.playerId === draft.playerId) : null;
  // When a sell is staged, buy options collapse to the SAME role to keep composition 3/8/8/6.
  const enforcedRole: FavcRole | null = draftSell?.role ?? (roleFilter === 'all' ? null : roleFilter);

  const buyableMarket = useMemo(() => {
    return marketPlayers
      .filter(player => {
        const id = player.playerId ?? player.id;
        if (heldIds.has(id)) return false;
        if (enforcedRole && player.role !== enforcedRole) return false;
        return true;
      })
      .slice(0, 200);
  }, [marketPlayers, heldIds, enforcedRole]);

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

  // Net P/L if both sell + buy go through (with the same role)
  const netEffect = useMemo(() => {
    if (!sellPreview || !buyPreview) return null;
    const cashAfterSell = sellPreview.cashAfter;
    const cashAfterBuyFromSell = Number((cashAfterSell - buyPreview.netAmount).toFixed(2));
    const capitalAddedForBuy = Math.max(0, Number((buyPreview.netAmount - cashAfterSell).toFixed(2)));
    const finalCash = capitalAddedForBuy > 0 ? 0 : cashAfterBuyFromSell;
    const totalCommissions = Number((sellPreview.commission + buyPreview.commission).toFixed(2));
    const netCashChange = Number((finalCash - financials.cashBalance).toFixed(2));
    return {
      totalCommissions,
      finalCash,
      capitalAddedForBuy,
      netCashChange,
    };
  }, [sellPreview, buyPreview, financials.cashBalance]);

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
      text: `Venduto ${trade.playerName} a quota ${sellPreview.quote.toFixed(0)} (+${formatCredits(sellPreview.netAmount)} cash). Commissione 2% ${formatCredits(sellPreview.commission)}. Ora puoi comprare un altro ${roleNames[draftSell.role]} per ricomporre la rosa.`,
    });
    // Pre-select buy with same role
    setRoleFilter(draftSell.role);
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
    setRoleFilter('all');
    setMessage({
      tone: 'success',
      text: `Acquistato ${trade.playerName} a quota ${buyPreview.quote.toFixed(0)} (-${formatCredits(buyPreview.netAmount)} cash). Commissione 2% ${formatCredits(buyPreview.commission)}.${buyPreview.capitalAdded > 0 ? ` Capitale extra virtuale ${formatCredits(buyPreview.capitalAdded)}.` : ''}`,
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
  const roleSelectorRole = enforcedRole ?? roleFilter;
  const ruleNote = draftSell
    ? `Stai vendendo un ${roleNames[draftSell.role]}: il mercato mostra solo ${roleNames[draftSell.role]} per mantenere la composizione 3/8/8/6.`
    : roleFilter !== 'all'
      ? `Filtro mercato: ${roleNames[roleFilter as FavcRole]}.`
      : 'Filtra per ruolo per comprare un sostituto.';

  return (
    <div className="trade-round-panel card">
      <div className="trade-round-header">
        <div>
          <span className="sim-info-eyebrow">Operazioni libere - G{round}</span>
          <h3>Compra e vendi - {roster.name}</h3>
          <p>Le operazioni sono solo locali e aggiornano cash, valore rosa e guadagno %. Commissione acquisto 2% e vendita 2%.</p>
        </div>
        <div className="trade-round-budget">
          <span className="sim-info-eyebrow">Budget / Cash virtuale</span>
          <strong>{formatCredits(financials.cashBalance)}</strong>
          <small>{financials.cashBalance > 0 ? 'disponibile per acquisti' : 'esaurito - prossimo acquisto aggiunge capitale virtuale'}</small>
        </div>
      </div>

      <div className="trade-round-grid">
        <div className="trade-round-side trade-round-side-sell">
          <div className="trade-round-side-head">
            <h4>Vendi un giocatore</h4>
            <span className="badge badge-amber">commissione 2%</span>
          </div>
          <select
            value={draft?.kind === 'sell' ? draft.playerId : ''}
            onChange={event => setDraft(event.target.value ? { kind: 'sell', playerId: event.target.value } : null)}
          >
            <option value="">Seleziona dalla rosa attiva</option>
            {(['P', 'D', 'C', 'A'] as FavcRole[]).map(role => {
              const players = activePositions.filter(p => p.role === role);
              if (players.length === 0) return null;
              return (
                <optgroup key={role} label={`${roleNames[role]} (${players.length})`}>
                  {players.map(position => {
                    const quote = quoteForPlayerAtRound(position.playerId, position.initialQuote);
                    const proceeds = quote * (1 - SELL_COMMISSION_RATE);
                    return (
                      <option key={position.playerId} value={position.playerId}>
                        {position.playerName} - {position.realTeam} - quota G{round} {quote.toFixed(0)} - netto +{proceeds.toFixed(2)}
                      </option>
                    );
                  })}
                </optgroup>
              );
            })}
          </select>
          {sellPreview && draftSell && (
            <div className="trade-round-preview">
              <div className="trade-round-preview-player">
                <span className={`role-badge role-badge-${ROLE_TONE[draftSell.role]}`}>{draftSell.role}</span>
                <div>
                  <strong>{draftSell.playerName}</strong>
                  <small>{draftSell.realTeam} - quota iniziale {draftSell.initialQuote}</small>
                </div>
              </div>
              <div><span>Quota G{round}</span><strong>{formatCredits(sellPreview.quote)}</strong></div>
              <div><span>Lordo vendita</span><strong>{formatCredits(sellPreview.grossAmount)}</strong></div>
              <div><span>Commissione 2%</span><strong>-{formatCredits(sellPreview.commission)}</strong></div>
              <div><span>Netto incassato</span><strong className="positive">+{formatCredits(sellPreview.netAmount)}</strong></div>
              <div><span>Cash dopo</span><strong>{formatCredits(sellPreview.cashAfter)}</strong></div>
              <button type="button" className="button button-secondary trade-round-confirm" onClick={executeSell}>Conferma vendita {draftSell.playerName}</button>
            </div>
          )}
        </div>

        <div className="trade-round-side trade-round-side-buy">
          <div className="trade-round-side-head">
            <h4>Compra un giocatore</h4>
            <span className="badge badge-blue">commissione 2%</span>
          </div>
          <div className="trade-round-role-filter">
            <span>Ruolo</span>
            <div className="trade-round-role-buttons">
              <button type="button" className={roleSelectorRole === 'all' ? 'active' : ''} onClick={() => !draftSell && setRoleFilter('all')} disabled={Boolean(draftSell)}>Tutti</button>
              {(['P', 'D', 'C', 'A'] as FavcRole[]).map(role => (
                <button
                  type="button"
                  key={role}
                  className={`role-pill role-pill-${ROLE_TONE[role]} ${roleSelectorRole === role ? 'active' : ''}`}
                  onClick={() => !draftSell && setRoleFilter(role)}
                  disabled={Boolean(draftSell) && draftSell.role !== role}
                >
                  {roleNames[role]}
                </button>
              ))}
            </div>
          </div>
          <p className="trade-round-rule-note">{ruleNote}</p>
          <select
            value={draft?.kind === 'buy' ? draft.playerId : ''}
            onChange={event => setDraft(event.target.value ? { kind: 'buy', playerId: event.target.value } : null)}
          >
            <option value="">Seleziona dal mercato ({buyableMarket.length} disponibili)</option>
            {buyableMarket.map(player => {
              const id = player.playerId ?? player.id;
              const quote = quoteForPlayerAtRound(id, player.quote);
              const totalCost = quote * (1 + BUY_COMMISSION_RATE);
              return (
                <option key={id} value={id}>
                  {player.playerName} ({player.role}) - {player.realTeam} - quota G{round} {quote.toFixed(0)} - totale -{totalCost.toFixed(2)}
                </option>
              );
            })}
          </select>
          {buyPreview && draftBuy && (
            <div className="trade-round-preview">
              <div className="trade-round-preview-player">
                <span className={`role-badge role-badge-${ROLE_TONE[draftBuy.role]}`}>{draftBuy.role}</span>
                <div>
                  <strong>{draftBuy.playerName}</strong>
                  <small>{draftBuy.realTeam} - quota mercato {draftBuy.quote}</small>
                </div>
              </div>
              <div><span>Quota G{round}</span><strong>{formatCredits(buyPreview.quote)}</strong></div>
              <div><span>Commissione 2%</span><strong>+{formatCredits(buyPreview.commission)}</strong></div>
              <div><span>Costo totale</span><strong className="negative">-{formatCredits(buyPreview.netAmount)}</strong></div>
              {buyPreview.capitalAdded > 0 && (
                <div><span>Capitale extra virtuale</span><strong className="amber">{formatCredits(buyPreview.capitalAdded)}</strong></div>
              )}
              <div><span>Cash dopo</span><strong>{formatCredits(buyPreview.cashAfter)}</strong></div>
              <button type="button" className="button button-primary trade-round-confirm" onClick={executeBuy}>Conferma acquisto {draftBuy.playerName}</button>
            </div>
          )}
        </div>
      </div>

      {netEffect && draftSell && draftBuy && (
        <div className="trade-round-net">
          <span className="sim-info-eyebrow">Effetto netto cambio (vendita + acquisto)</span>
          <div className="trade-round-net-grid">
            <div><span>Commissioni totali</span><strong>-{formatCredits(netEffect.totalCommissions)}</strong></div>
            <div><span>Variazione cash</span><strong className={valueTone(netEffect.netCashChange)}>{formatSignedCredits(netEffect.netCashChange)}</strong></div>
            <div><span>Cash dopo doppia operazione</span><strong>{formatCredits(netEffect.finalCash)}</strong></div>
            {netEffect.capitalAddedForBuy > 0 && (
              <div><span>Capitale extra richiesto</span><strong className="amber">{formatCredits(netEffect.capitalAddedForBuy)}</strong></div>
            )}
          </div>
          <p className="table-note">Per portare a termine entrambe le operazioni, conferma prima la vendita poi l'acquisto: il cash si aggiorna in tempo reale.</p>
        </div>
      )}

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
              <tr><th>Tipo</th><th>Giocatore</th><th>Ruolo</th><th>Quota</th><th>Comm.</th><th>Cash dopo</th><th></th></tr>
            </thead>
            <tbody>
              {tradesAtThisRound.map(trade => (
                <tr key={trade.id}>
                  <td><span className={`badge ${trade.type === 'BUY' ? 'badge-blue' : 'badge-amber'}`}>{trade.type}</span></td>
                  <td><strong>{trade.playerName}</strong><span className="table-subline">{trade.realTeam}</span></td>
                  <td><span className={`role-badge role-badge-${ROLE_TONE[trade.role]}`}>{trade.role}</span></td>
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
