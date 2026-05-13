import PlayerTrendChart from './PlayerTrendChart';
import type { PlayerCardData } from './PlayerCard';
import {
  calculateEstimatedPositionValue,
  calculateFantaTradingReturnPct,
} from '../utils/playerTrend';
import { formatCredits, formatSignedCredits, formatSignedPercent, valueTone } from '../utils/format';

type Props = {
  player: PlayerCardData | null;
  onClose: () => void;
};

export default function PlayerDetailDrawer({ player, onClose }: Props) {
  if (!player) return null;

  const quoteChange = player.currentQuote - player.initialQuote;
  const returnPct = calculateFantaTradingReturnPct(player.initialQuote, player.currentQuote);
  const estimatedValue = calculateEstimatedPositionValue(player.initialQuote, player.currentQuote, player.fantasyMultiplier);
  const pl = estimatedValue - player.initialQuote;
  const roi = player.initialQuote > 0 ? (pl / player.initialQuote) * 100 : 0;

  return (
    <div className="player-drawer-backdrop" onClick={onClose}>
      <aside className="player-drawer" onClick={event => event.stopPropagation()}>
        <button className="drawer-close" type="button" onClick={onClose}>Chiudi</button>
        <div className="drawer-header">
          <span className="role-badge">{player.role}</span>
          <h2>{player.playerName}</h2>
          <p>{player.realTeam}</p>
        </div>

        <div className="detail-metric-grid">
          <div><span>Quota iniziale</span><strong>{formatCredits(player.initialQuote)}</strong></div>
          <div><span>Quota corrente</span><strong>{formatCredits(player.currentQuote)}</strong></div>
          <div><span>Delta quota</span><strong className={valueTone(quoteChange)}>{formatSignedCredits(quoteChange)}</strong></div>
          <div><span>FT return</span><strong className={valueTone(returnPct)}>{formatSignedPercent(returnPct)}</strong></div>
          <div><span>P/L stimato</span><strong className={valueTone(pl)}>{formatSignedCredits(pl)}</strong></div>
          <div><span>ROI giocatore</span><strong className={valueTone(roi)}>{formatSignedPercent(roi)}</strong></div>
        </div>

        <div className="drawer-chart-grid">
          <div>
            <div className="doc-title">Andamento quotazione</div>
            <PlayerTrendChart data={player.trend} mode="full" valueKey="quote" />
          </div>
          <div>
            <div className="doc-title">Andamento valore azione</div>
            <PlayerTrendChart data={player.trend} mode="full" valueKey="estimatedValue" />
          </div>
        </div>

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
              {player.trend.map(point => (
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
            Source: {player.trend[0]?.source ?? 'mock'}. Se synthetic, andamento stimato nel pilot e non quotazione ufficiale Fantacalcio round-by-round.
          </div>
        </div>
      </aside>
    </div>
  );
}
