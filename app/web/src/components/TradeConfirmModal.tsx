import type { DemoMarketPlayer, DemoPosition } from '../mock/favcDemoData';
import { roleLimits } from '../mock/favcDemoData';
import { buildBuyConfirmation, buildSellConfirmation } from '../utils/tradeConfirmation';
import { formatCredits } from '../utils/format';

type TradeConfirmModalProps =
  | {
      type: 'buy';
      player: DemoMarketPlayer;
      positions: DemoPosition[];
      virtualCashBalance: number;
      totalCapitalDeposited: number;
      submitting: boolean;
      error?: string;
      onCancel: () => void;
      onConfirm: () => void;
    }
  | {
      type: 'sell';
      position: DemoPosition;
      positions: DemoPosition[];
      virtualCashBalance: number;
      totalCapitalDeposited: number;
      submitting: boolean;
      error?: string;
      onCancel: () => void;
      onConfirm: () => void;
    };

export default function TradeConfirmModal(props: TradeConfirmModalProps) {
  const isBuy = props.type === 'buy';
  const playerName = isBuy ? props.player.playerName : props.position.playerName;
  const role = isBuy ? props.player.role : props.position.role;
  const club = isBuy ? props.player.realTeam : props.position.realTeam;
  const quote = isBuy ? props.player.quote : props.position.currentQuote;
  const buySummary = props.type === 'buy'
    ? buildBuyConfirmation(props.player, props.positions, props.virtualCashBalance, props.totalCapitalDeposited)
    : null;
  const sellSummary = props.type === 'sell'
    ? buildSellConfirmation(props.position, props.positions, props.virtualCashBalance)
    : null;
  const canConfirm = isBuy ? Boolean(buySummary?.canConfirm) : true;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={props.onCancel}>
      <section className="trade-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="trade-confirm-title" onMouseDown={event => event.stopPropagation()}>
        <header className="trade-confirm-header">
          <div>
            <span className="badge badge-blue">{isBuy ? 'BUY reale demo' : 'SELL reale demo'}</span>
            <h2 id="trade-confirm-title">{isBuy ? 'Conferma acquisto' : 'Conferma vendita'}</h2>
          </div>
          <button type="button" className="drawer-close" onClick={props.onCancel}>x</button>
        </header>

        <div className="trade-player-summary">
          <strong>{playerName}</strong>
          <span>{club}</span>
          <span className="role-badge">{role}</span>
          <span>Quota {formatCredits(quote)}</span>
        </div>

        {isBuy ? (
          <div className="settlement-formula compact-formula">
            <div><span>Commissione acquisto</span><strong>{formatCredits(buySummary?.commissionAmount ?? 0)}</strong></div>
            <div><span>Costo totale</span><strong>{formatCredits(buySummary?.totalCost ?? 0)}</strong></div>
            <div><span>Cash disponibile</span><strong>{formatCredits(buySummary?.cashAvailable ?? 0)}</strong></div>
            <div><span>Capital added stimato</span><strong>{formatCredits(buySummary?.capitalAdded ?? 0)}</strong></div>
            <div><span>Total capital dopo</span><strong>{formatCredits(buySummary?.totalCapitalAfter ?? 0)}</strong></div>
          </div>
        ) : (
          <div className="settlement-formula compact-formula">
            <div><span>Valore lordo vendita</span><strong>{formatCredits(sellSummary?.grossAmount ?? 0)}</strong></div>
            <div><span>Commissione vendita</span><strong>{formatCredits(sellSummary?.commissionAmount ?? 0)}</strong></div>
            <div><span>Incasso netto</span><strong>{formatCredits(sellSummary?.netAmount ?? 0)}</strong></div>
            <div><span>Cash prima</span><strong>{formatCredits(sellSummary?.cashBefore ?? 0)}</strong></div>
            <div><span>Cash dopo</span><strong>{formatCredits(sellSummary?.cashAfter ?? 0)}</strong></div>
          </div>
        )}

        {isBuy && buySummary && !buySummary.canConfirm && (
          <div className="trade-warning">{buySummary.blockingReason}</div>
        )}
        {!isBuy && sellSummary?.leavesRoleShort && (
          <div className="trade-warning">
            Dopo la vendita resteranno {sellSummary.roleCountAfterSell}/{roleLimits[props.position.role]} nel ruolo {props.position.role}. La rosa sara temporaneamente incompleta finche non ricompri.
          </div>
        )}
        {props.error && <div className="trade-error">{props.error}</div>}

        <p className="table-note">
          Operazione reale sulla demo backend: modifica il team demo nel database solo dopo conferma. Nessun denaro reale e nessun payout reale.
        </p>

        <footer className="trade-confirm-actions">
          <button type="button" className="button button-muted" onClick={props.onCancel} disabled={props.submitting}>Annulla</button>
          <button type="button" className="button" onClick={props.onConfirm} disabled={props.submitting || !canConfirm}>
            {props.submitting ? 'Invio...' : isBuy ? 'Conferma acquisto' : 'Conferma vendita'}
          </button>
        </footer>
      </section>
    </div>
  );
}
