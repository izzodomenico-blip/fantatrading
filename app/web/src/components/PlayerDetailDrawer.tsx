import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceDot,
} from 'recharts';
import PlayerTrendChart from './PlayerTrendChart';
import type { PlayerCardData } from './PlayerCard';
import { AXIS_STYLE, COLORS, GRID_STYLE, TOOLTIP_STYLE } from '../data';
import {
  calculateEstimatedPositionValue,
  calculateFantaTradingReturnPct,
} from '../utils/playerTrend';
import { formatCredits, formatSignedCredits, formatSignedPercent, valueTone } from '../utils/format';

type Props = {
  player: PlayerCardData | null;
  onClose: () => void;
};

type DrawerTab = 'storia' | 'trend' | 'tabella';

function eventChips(point: PlayerCardData['trend'][number]) {
  const chips: Array<{ label: string; tone: string }> = [];
  if (point.isSv) chips.push({ label: 'SV', tone: 'gray' });
  if ((point.goals ?? 0) > 0) chips.push({ label: `GOL ${point.goals}`, tone: 'green' });
  if ((point.assists ?? 0) > 0) chips.push({ label: `ASS ${point.assists}`, tone: 'blue' });
  if ((point.penaltySaved ?? 0) > 0) chips.push({ label: 'RIG PAR', tone: 'green' });
  if ((point.penaltyMissed ?? 0) > 0) chips.push({ label: 'RIG SBA', tone: 'red' });
  if ((point.ownGoals ?? 0) > 0) chips.push({ label: `AUTO ${point.ownGoals}`, tone: 'red' });
  if ((point.redCards ?? 0) > 0) chips.push({ label: 'ESP', tone: 'red' });
  if ((point.yellowCards ?? 0) > 0) chips.push({ label: 'AMM', tone: 'amber' });
  return chips;
}

export default function PlayerDetailDrawer({ player, onClose }: Props) {
  const [tab, setTab] = useState<DrawerTab>('storia');
  const [range, setRange] = useState<'5' | '10' | 'all'>('all');

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
          <div><span>Δ quota</span><strong className={valueTone(quoteChange)}>{formatSignedCredits(quoteChange)}</strong></div>
          <div><span>FT return</span><strong className={valueTone(returnPct)}>{formatSignedPercent(returnPct)}</strong></div>
          <div><span>P/L stimato</span><strong className={valueTone(pl)}>{formatSignedCredits(pl)}</strong></div>
          <div><span>ROI giocatore</span><strong className={valueTone(roi)}>{formatSignedPercent(roi)}</strong></div>
        </div>

        <nav className="drawer-tabs">
          <button type="button" className={tab === 'storia' ? 'active' : ''} onClick={() => setTab('storia')}>Storia fantacalcistica</button>
          <button type="button" className={tab === 'trend' ? 'active' : ''} onClick={() => setTab('trend')}>Trend quote</button>
          <button type="button" className={tab === 'tabella' ? 'active' : ''} onClick={() => setTab('tabella')}>Tabella round</button>
        </nav>

        {tab === 'storia' && (
          <PlayerHistoryTab player={player} range={range} onRangeChange={setRange} />
        )}

        {tab === 'trend' && (
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
        )}

        {tab === 'tabella' && (
          <div className="card table-scroll">
            <table>
              <thead>
                <tr>
                  <th>G</th>
                  <th>Voto</th>
                  <th>Fanta</th>
                  <th>Eventi</th>
                  <th>SV</th>
                  <th>Quota</th>
                  <th>Δ</th>
                  <th>Bonus FT</th>
                  <th>Valore</th>
                </tr>
              </thead>
              <tbody>
                {player.trend.map(point => {
                  const chips = eventChips(point);
                  return (
                    <tr key={point.round}>
                      <td>G{point.round}</td>
                      <td>{point.isSv ? '-' : (point.vote ?? 'n.d.')}</td>
                      <td>{point.isSv ? '-' : (point.fantasyVote ?? '-')}</td>
                      <td>
                        <div className="event-badge-row">
                          {chips.length === 0 && <span className="event-badge event-badge-gray">-</span>}
                          {chips.map(chip => (
                            <span key={chip.label} className={`event-badge event-badge-${chip.tone}`}>{chip.label}</span>
                          ))}
                        </div>
                      </td>
                      <td>{point.isSv ? <span className="badge badge-amber">SV</span> : '-'}</td>
                      <td>{formatCredits(point.quote)}</td>
                      <td className={valueTone(point.quoteChange)}>{formatSignedCredits(point.quoteChange)}</td>
                      <td className={valueTone(point.fantasyBonusPct ?? 0)}>{formatSignedPercent(point.fantasyBonusPct ?? 0)}</td>
                      <td>{formatCredits(point.estimatedValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="table-note">
              Source quote: {player.trend[0]?.source ?? 'mock'}. Source voti: {player.trend.some(point => point.sourceVote === 'official') ? 'ufficiali Fantacalcio' : 'sintetici/mancanti'}.
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function PlayerHistoryTab({
  player,
  range,
  onRangeChange,
}: {
  player: PlayerCardData;
  range: '5' | '10' | 'all';
  onRangeChange: (range: '5' | '10' | 'all') => void;
}) {
  const visiblePoints = useMemo(() => {
    if (range === 'all') return player.trend;
    return player.trend.slice(-Number(range));
  }, [player.trend, range]);

  const playedPoints = visiblePoints.filter(point => !point.isSv && typeof point.vote === 'number');
  const insights = useMemo(() => {
    const votes = playedPoints.map(point => point.vote as number);
    const fantasy = playedPoints
      .map(point => point.fantasyVote)
      .filter((value): value is number => typeof value === 'number');
    const bonusSum = visiblePoints.reduce((sum, point) => sum + (point.fantasyBonusPct ?? 0), 0);
    const contributionSum = visiblePoints.reduce((sum, point) => {
      const delta = point.estimatedValue - player.initialQuote;
      return sum + delta;
    }, 0);
    const bestRound = playedPoints.reduce<typeof playedPoints[number] | null>(
      (best, point) => (best === null || (point.vote ?? 0) > (best.vote ?? 0)) ? point : best,
      null,
    );
    const worstRound = playedPoints.reduce<typeof playedPoints[number] | null>(
      (worst, point) => (worst === null || (point.vote ?? 10) < (worst.vote ?? 10)) ? point : worst,
      null,
    );
    return {
      avgVote: votes.length ? Number((votes.reduce((sum, v) => sum + v, 0) / votes.length).toFixed(2)) : null,
      avgFantasy: fantasy.length ? Number((fantasy.reduce((sum, v) => sum + v, 0) / fantasy.length).toFixed(2)) : null,
      played: playedPoints.length,
      svCount: visiblePoints.length - playedPoints.length,
      bestRound,
      worstRound,
      bonusSum: Number(bonusSum.toFixed(2)),
      contributionSum: Number(contributionSum.toFixed(2)),
    };
  }, [playedPoints, visiblePoints, player.initialQuote]);

  const chartData = useMemo(() => visiblePoints.map(point => {
    const cumulativeContribution = visiblePoints
      .filter(item => item.round <= point.round)
      .reduce((sum, item) => sum + (item.estimatedValue - player.initialQuote), 0);
    return {
      round: point.round,
      vote: point.isSv ? null : point.vote,
      fantasy: point.isSv ? null : point.fantasyVote,
      quote: point.quote,
      cumulativeContribution: Number(cumulativeContribution.toFixed(2)),
    };
  }), [visiblePoints, player.initialQuote]);

  return (
    <div className="player-history">
      <div className="player-history-toggle">
        <button type="button" className={range === '5' ? 'active' : ''} onClick={() => onRangeChange('5')}>Ultime 5</button>
        <button type="button" className={range === '10' ? 'active' : ''} onClick={() => onRangeChange('10')}>Ultime 10</button>
        <button type="button" className={range === 'all' ? 'active' : ''} onClick={() => onRangeChange('all')}>Tutte</button>
      </div>

      <div className="player-history-insights">
        <InsightCard label="Media voto" value={insights.avgVote === null ? 'n.d.' : insights.avgVote.toFixed(2).replace('.', ',')} sub={`${insights.played} presenze`} tone="blue" />
        <InsightCard label="Media fantavoto" value={insights.avgFantasy === null ? 'n.d.' : insights.avgFantasy.toFixed(2).replace('.', ',')} sub={insights.bonusSum >= 0 ? 'positivo' : 'negativo'} tone="purple" />
        <InsightCard label="Presenze con voto" value={`${insights.played}`} sub={`${insights.svCount} SV`} tone="neutral" />
        <InsightCard label="Bonus/Malus totale" value={formatSignedPercent(insights.bonusSum, 2)} sub="somma giornate" tone={insights.bonusSum >= 0 ? 'green' : 'red'} />
        <InsightCard label="Contributo economico" value={formatSignedCredits(insights.contributionSum, 2)} sub="rispetto a quota iniziale" tone={insights.contributionSum >= 0 ? 'green' : 'red'} />
        <InsightCard
          label="Miglior giornata"
          value={insights.bestRound ? `G${insights.bestRound.round} - ${(insights.bestRound.vote ?? 0).toFixed(1).replace('.', ',')}` : 'n.d.'}
          sub={insights.bestRound ? formatSignedPercent(insights.bestRound.fantasyBonusPct ?? 0) : ''}
          tone="green"
        />
        <InsightCard
          label="Peggior giornata"
          value={insights.worstRound ? `G${insights.worstRound.round} - ${(insights.worstRound.vote ?? 0).toFixed(1).replace('.', ',')}` : 'n.d.'}
          sub={insights.worstRound ? formatSignedPercent(insights.worstRound.fantasyBonusPct ?? 0) : ''}
          tone="red"
        />
      </div>

      <div className="player-history-charts">
        <div className="card chart-card">
          <div className="doc-title">Andamento voto e fantavoto</div>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="round" tickFormatter={(value: number) => `G${value}`} {...AXIS_STYLE} />
              <YAxis domain={[3, 10]} {...AXIS_STYLE} />
              <Tooltip {...TOOLTIP_STYLE} labelFormatter={(label) => `Giornata ${label}`} />
              <Line type="monotone" dataKey="vote" name="Voto" stroke={COLORS.blue} strokeWidth={2.5} dot={false} connectNulls activeDot={{ r: 4 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="fantasy" name="Fantavoto" stroke={COLORS.amber} strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls activeDot={{ r: 4 }} isAnimationActive={false} />
              {insights.bestRound && <ReferenceDot x={insights.bestRound.round} y={insights.bestRound.vote ?? 0} r={5} fill={COLORS.green} stroke="#0b0d12" strokeWidth={2} />}
              {insights.worstRound && <ReferenceDot x={insights.worstRound.round} y={insights.worstRound.vote ?? 0} r={5} fill={COLORS.red} stroke="#0b0d12" strokeWidth={2} />}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <div className="doc-title">Contributo economico cumulato</div>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="round" tickFormatter={(value: number) => `G${value}`} {...AXIS_STYLE} />
              <YAxis tickFormatter={(value: number) => formatCredits(value, 1)} {...AXIS_STYLE} />
              <Tooltip {...TOOLTIP_STYLE} labelFormatter={(label) => `Giornata ${label}`} formatter={(value: number) => formatSignedCredits(value)} />
              <Line
                type="monotone"
                dataKey="cumulativeContribution"
                name="Contributo cumulato"
                stroke={insights.contributionSum >= 0 ? COLORS.green : COLORS.red}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'neutral' }) {
  return (
    <div className={`insight-card insight-tone-${tone}`}>
      <span className="insight-label">{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}
