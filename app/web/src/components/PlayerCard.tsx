import PlayerTrendChart from './PlayerTrendChart';
import type { FavcRole, FavcStatus } from '../mock/favcDemoData';
import type { PlayerTrendPoint } from '../utils/playerTrend';
import {
  calculateEstimatedPositionValue,
  calculateFantaTradingReturnPct,
  getTrendTone,
} from '../utils/playerTrend';
import { formatCredits, formatSignedCredits, formatSignedPercent, valueTone } from '../utils/format';

export type PlayerCardData = {
  id: string;
  playerName: string;
  realTeam: string;
  role: FavcRole;
  initialQuote: number;
  currentQuote: number;
  fantasyMultiplier: number;
  status?: FavcStatus;
  trend: PlayerTrendPoint[];
  actionLabel?: string;
  actionDisabled?: boolean;
};

type Props = {
  player: PlayerCardData;
  compact?: boolean;
  onSelect?: (player: PlayerCardData) => void;
  onAction?: (player: PlayerCardData) => void;
};

const trendLabels = {
  up: 'rialzo',
  stable: 'stabile',
  down: 'ribasso',
};

function trendClass(tone: 'up' | 'stable' | 'down') {
  if (tone === 'up') return 'badge badge-green';
  if (tone === 'down') return 'badge badge-red';
  return 'badge badge-amber';
}

export default function PlayerCard({ player, compact = false, onSelect, onAction }: Props) {
  const quoteChange = player.currentQuote - player.initialQuote;
  const returnPct = calculateFantaTradingReturnPct(player.initialQuote, player.currentQuote);
  const estimatedValue = calculateEstimatedPositionValue(player.initialQuote, player.currentQuote, player.fantasyMultiplier);
  const pl = estimatedValue - player.initialQuote;
  const trend = getTrendTone(player.trend);

  return (
    <article className={`player-card ${compact ? 'player-card-compact' : ''}`} onClick={() => onSelect?.(player)}>
      <div className="player-card-top">
        <div>
          <h3>{player.playerName}</h3>
          <p>{player.realTeam}</p>
        </div>
        <div className="player-card-badges">
          <span className="role-badge">{player.role}</span>
          <span className={trendClass(trend)}>{trendLabels[trend]}</span>
        </div>
      </div>

      <PlayerTrendChart data={player.trend} mode="mini" />

      <div className="player-card-stats">
        <div>
          <span>Qt. iniziale</span>
          <strong>{formatCredits(player.initialQuote)}</strong>
        </div>
        <div>
          <span>Qt. corrente</span>
          <strong>{formatCredits(player.currentQuote)}</strong>
        </div>
        <div>
          <span>Delta quota</span>
          <strong className={valueTone(quoteChange)}>{formatSignedCredits(quoteChange)}</strong>
        </div>
        <div>
          <span>FT return</span>
          <strong className={valueTone(returnPct)}>{formatSignedPercent(returnPct)}</strong>
        </div>
        <div>
          <span>Valore stimato</span>
          <strong>{formatCredits(estimatedValue)}</strong>
        </div>
        <div>
          <span>P/L</span>
          <strong className={valueTone(pl)}>{formatSignedCredits(pl)}</strong>
        </div>
      </div>

      <div className="player-card-footer">
        <span className={`badge ${player.status === 'SOLD' ? 'badge-red' : 'badge-green'}`}>
          {player.status ?? 'MARKET'}
        </span>
        <span>x{player.fantasyMultiplier.toFixed(2)}</span>
        {player.actionLabel && (
          <button
            className={`favc-action ${player.actionLabel.toLowerCase().includes('vendi') ? 'favc-action-sell' : ''}`}
            disabled={player.actionDisabled}
            type="button"
            onClick={event => {
              event.stopPropagation();
              onAction?.(player);
            }}
          >
            {player.actionLabel}
          </button>
        )}
      </div>
    </article>
  );
}
