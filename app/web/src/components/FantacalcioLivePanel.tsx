import { useMemo } from 'react';
import type { PlayerRoundSnapshot, TeamRoundSnapshot } from '../utils/teamRoundSimulation';
import { formatCredits, formatSignedCredits, formatSignedPercent, valueTone } from '../utils/format';

type Props = {
  round: number;
  maxRound: number;
  snapshot: TeamRoundSnapshot;
  rosterName?: string;
  onSelectPlayer?: (player: PlayerRoundSnapshot) => void;
};

const FASCIA_ORDER = ['FASCIA_0', 'FASCIA_1', 'FASCIA_2', 'FASCIA_3', 'FASCIA_4'] as const;

const FASCIA_LABEL: Record<string, string> = {
  FASCIA_0: 'Fascia 0',
  FASCIA_1: 'Fascia 1',
  FASCIA_2: 'Fascia 2',
  FASCIA_3: 'Fascia 3',
  FASCIA_4: 'Fascia 4',
};

const FASCIA_RANGE: Record<string, string> = {
  FASCIA_0: '< 5,00',
  FASCIA_1: '5,00 - 5,49',
  FASCIA_2: '5,50 - 5,99',
  FASCIA_3: '6,00 - 6,49',
  FASCIA_4: '>= 6,50',
};

const FASCIA_TONE: Record<string, string> = {
  FASCIA_0: 'fascia-tone-red',
  FASCIA_1: 'fascia-tone-amber',
  FASCIA_2: 'fascia-tone-neutral',
  FASCIA_3: 'fascia-tone-blue',
  FASCIA_4: 'fascia-tone-green',
};

const FASCIA_HEADLINE: Record<string, string> = {
  FASCIA_0: 'Giornata difficile per la rosa',
  FASCIA_1: 'Prestazione sotto la sufficienza',
  FASCIA_2: 'Rosa in equilibrio sotto il pari',
  FASCIA_3: 'Rosa positiva oltre la sufficienza',
  FASCIA_4: 'Giornata da copertina',
};

function eventBadges(player: PlayerRoundSnapshot) {
  const badges: Array<{ label: string; tone: 'green' | 'blue' | 'amber' | 'red' | 'gray' }> = [];
  if (player.isSv) {
    badges.push({ label: 'SV', tone: 'gray' });
    return badges;
  }
  if ((player.goals ?? 0) > 0) badges.push({ label: `GOL ${player.goals}`, tone: player.role === 'P' ? 'red' : 'green' });
  if ((player.assists ?? 0) > 0) badges.push({ label: `ASS ${player.assists}`, tone: 'blue' });
  if ((player.penaltySaved ?? 0) > 0) badges.push({ label: 'RIG PARATO', tone: 'green' });
  if ((player.penaltyMissed ?? 0) > 0) badges.push({ label: 'RIG SBAGLIATO', tone: 'red' });
  if ((player.ownGoals ?? 0) > 0) badges.push({ label: `AUTOGOL ${player.ownGoals}`, tone: 'red' });
  if ((player.redCards ?? 0) > 0) badges.push({ label: 'ESP', tone: 'red' });
  if ((player.yellowCards ?? 0) > 0) badges.push({ label: 'AMM', tone: 'amber' });
  return badges;
}

function describePlayerContribution(player: PlayerRoundSnapshot) {
  if (player.isSv) return 'SV';
  const reasons: string[] = [];
  if ((player.goals ?? 0) > 0) reasons.push('gol');
  if ((player.assists ?? 0) > 0) reasons.push('assist');
  if ((player.fantasyBonusPct ?? 0) > 1) reasons.push('bonus alto');
  if ((player.fantasyBonusPct ?? 0) < -1) reasons.push('malus pesante');
  if (player.quoteChange > 0.4) reasons.push('quota in salita');
  if (player.quoteChange < -0.4) reasons.push('quota in calo');
  if ((player.vote ?? 6) >= 7.5) reasons.push('voto alto');
  if ((player.vote ?? 6) <= 4.5) reasons.push('voto basso');
  return reasons.length ? reasons.join(' · ') : 'andamento neutro';
}

export default function FantacalcioLivePanel({ round, maxRound, snapshot, rosterName, onSelectPlayer }: Props) {
  const fasciaKey = snapshot.teamBandLabel;
  const fasciaLabel = FASCIA_LABEL[fasciaKey] ?? fasciaKey;
  const fasciaTone = FASCIA_TONE[fasciaKey] ?? 'fascia-tone-neutral';
  const fasciaHeadline = FASCIA_HEADLINE[fasciaKey] ?? '';

  const sortedByContribution = useMemo(() => {
    return [...snapshot.playerSnapshots]
      .filter(player => !player.isSv || (player.profitLoss && player.profitLoss !== 0))
      .sort((a, b) => b.profitLoss - a.profitLoss);
  }, [snapshot.playerSnapshots]);
  const fantasyTotals = useMemo(() => {
    const voted = snapshot.playerSnapshots.filter(player => !player.isSv);
    const fantasyVotes = voted
      .map(player => player.fantasyVote ?? player.vote)
      .filter((value): value is number => typeof value === 'number');
    return {
      goals: snapshot.playerSnapshots.reduce((sum, player) => sum + (player.goals ?? 0), 0),
      assists: snapshot.playerSnapshots.reduce((sum, player) => sum + (player.assists ?? 0), 0),
      yellowCards: snapshot.playerSnapshots.reduce((sum, player) => sum + (player.yellowCards ?? 0), 0),
      redCards: snapshot.playerSnapshots.reduce((sum, player) => sum + (player.redCards ?? 0), 0),
      fantamedia: fantasyVotes.length ? Number((fantasyVotes.reduce((sum, value) => sum + value, 0) / fantasyVotes.length).toFixed(2)) : null,
    };
  }, [snapshot.playerSnapshots]);

  const top5 = sortedByContribution.slice(0, 5);
  const flop5 = sortedByContribution.slice(-5).reverse();
  const svPlayers = snapshot.playerSnapshots.filter(player => player.isSv);

  return (
    <div className="fantalive">
      <header className={`fantalive-hero ${fasciaTone}`}>
        <div className="fantalive-hero-content">
          <span className="fantalive-eyebrow">Fantacalcio Live{rosterName ? ` - ${rosterName}` : ''}</span>
          <h2>Giornata {round} di G{maxRound} - {fasciaLabel} raggiunta</h2>
          <p>{fasciaHeadline}. Media squadra <strong>{snapshot.teamVoteAverage === null ? 'n.d.' : snapshot.teamVoteAverage.toFixed(2).replace('.', ',')}</strong>, somma voti <strong>{snapshot.teamVoteSum}</strong>, {snapshot.playersWithVote} giocatori con voto e {snapshot.svCount} SV.</p>
        </div>
        <div className="fantalive-hero-stat">
          <span className="fantalive-eyebrow">Bonus medio applicato</span>
          <strong className={valueTone(snapshot.teamBandBonusMalusPct)}>{formatSignedPercent(snapshot.teamBandBonusMalusPct, 2)}</strong>
          <small>derivato da {fasciaLabel}</small>
        </div>
      </header>

      <div className="fantalive-summary">
        <SummaryCard label="Media squadra" value={snapshot.teamVoteAverage === null ? 'n.d.' : snapshot.teamVoteAverage.toFixed(2).replace('.', ',')} sub="SV escluso dalla media" tone="blue" />
        <SummaryCard label="Fascia squadra" value={fasciaLabel} sub={FASCIA_RANGE[fasciaKey]} tone="purple" />
        <SummaryCard label="Somma voti" value={String(snapshot.teamVoteSum.toFixed(2).replace('.', ','))} sub={`${snapshot.playersWithVote} con voto`} tone="neutral" />
        <SummaryCard label="Giocatori con voto" value={`${snapshot.playersWithVote}`} sub={`su ${snapshot.activePlayersCount} attivi`} tone="green" />
        <SummaryCard label="SV totali" value={`${snapshot.svCount}`} sub="esclusi dalla media" tone="amber" />
        <SummaryCard label="Gol" value={`${fantasyTotals.goals}`} sub="eventi reali giornata" tone="green" />
        <SummaryCard label="Assist" value={`${fantasyTotals.assists}`} sub="bonus fantacalcio" tone="blue" />
        <SummaryCard label="Cartellini" value={`${fantasyTotals.yellowCards + fantasyTotals.redCards}`} sub={`${fantasyTotals.yellowCards} amm, ${fantasyTotals.redCards} esp`} tone="amber" />
        <SummaryCard label="Fantamedia" value={fantasyTotals.fantamedia === null ? 'n.d.' : fantasyTotals.fantamedia.toFixed(2).replace('.', ',')} sub="sui giocatori con voto" tone="purple" />
        <SummaryCard label="Bonus/malus medio" value={formatSignedPercent(snapshot.teamBandBonusMalusPct, 2)} sub={`Fascia ${fasciaKey.replace('FASCIA_', '')}`} tone={snapshot.teamBandBonusMalusPct >= 0 ? 'green' : 'red'} />
        <SummaryCard label="Miglior contributo" value={snapshot.bestPlayer?.name ?? 'n.d.'} sub={snapshot.bestPlayer ? formatSignedCredits(snapshot.bestPlayer.profitLoss) : ''} tone="green" />
        <SummaryCard label="Peggior contributo" value={snapshot.worstPlayer?.name ?? 'n.d.'} sub={snapshot.worstPlayer ? formatSignedCredits(snapshot.worstPlayer.profitLoss) : ''} tone="red" />
      </div>

      <div className="fascia-ladder">
        <div className="fascia-ladder-header">
          <span className="fantalive-eyebrow">Fascia raggiunta</span>
          <strong>Media {snapshot.teamVoteAverage === null ? 'n.d.' : snapshot.teamVoteAverage.toFixed(2).replace('.', ',')} -&gt; {fasciaLabel}</strong>
        </div>
        <div className="fascia-ladder-track">
          {FASCIA_ORDER.map(step => {
            const isCurrent = step === fasciaKey;
            const reached = FASCIA_ORDER.indexOf(step) <= FASCIA_ORDER.indexOf(fasciaKey);
            return (
              <div className={`fascia-step ${isCurrent ? 'fascia-step-current' : ''} ${reached ? 'fascia-step-reached' : ''}`} key={step}>
                <span>{FASCIA_LABEL[step]}</span>
                <small>{FASCIA_RANGE[step]}</small>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fantalive-grid-toplflop">
        <PlayerHighlightCard
          title="Top 5 - migliori contributi"
          tone="green"
          players={top5}
          onSelectPlayer={onSelectPlayer}
        />
        <PlayerHighlightCard
          title="Flop 5 - peggiori contributi"
          tone="red"
          players={flop5}
          onSelectPlayer={onSelectPlayer}
        />
      </div>

      <div className="fantalive-table card">
        <div className="fantalive-table-head">
          <h3>Voti e bonus - tutti i 25 giocatori</h3>
          <p>Gli SV non entrano nella media squadra. Il bonus/malus FantaTrading dipende da fascia squadra + voto individuale.</p>
        </div>
        <div className="table-scroll">
          <table className="compact-table fantalive-vote-table">
            <thead>
              <tr>
                <th>Giocatore</th>
                <th>R</th>
                <th>Club</th>
                <th>Voto</th>
                <th>Fanta</th>
                <th>Eventi</th>
                <th>Quota</th>
                <th>Δ</th>
                <th>Fascia</th>
                <th>Bonus FT</th>
                <th>Valore prima</th>
                <th>Valore dopo</th>
                <th>Contributo €</th>
                <th>Contributo %</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.playerSnapshots.map(player => {
                const highlight = player.isSv ? 'sv-player-row' : '';
                const events = eventBadges(player);
                return (
                  <tr
                    key={player.playerId}
                    className={`fantalive-row clickable-row ${highlight}`}
                    onClick={() => onSelectPlayer?.(player)}
                  >
                    <td><strong>{player.name}</strong></td>
                    <td><span className="role-badge">{player.role}</span></td>
                    <td>{player.club}</td>
                    <td>{player.isSv ? <span className="badge badge-amber">SV</span> : <strong>{(player.vote ?? 0).toFixed(1).replace('.', ',')}</strong>}</td>
                    <td>{player.isSv ? '-' : (player.fantasyVote ?? player.vote ?? 0).toFixed(2).replace('.', ',')}</td>
                    <td>
                      <div className="event-badge-row">
                        {events.length === 0 && !player.isSv && <span className="event-badge event-badge-gray">-</span>}
                        {events.map(badge => (
                          <span key={badge.label} className={`event-badge event-badge-${badge.tone}`}>{badge.label}</span>
                        ))}
                      </div>
                    </td>
                    <td>{formatCredits(player.quote, 2)}</td>
                    <td className={valueTone(player.quoteChange)}>{formatSignedCredits(player.quoteChange, 2)}</td>
                    <td>{fasciaLabel.replace('Fascia ', 'F')}</td>
                    <td className={valueTone(player.fantasyBonusPct)}>{formatSignedPercent(player.fantasyBonusPct, 2)}</td>
                    <td>{formatCredits(player.valueBefore, 2)}</td>
                    <td>{formatCredits(player.estimatedValue, 2)}</td>
                    <td className={valueTone(player.profitLoss)}>{formatSignedCredits(player.profitLoss, 2)}</td>
                    <td className={valueTone(player.roiPct)}>{formatSignedPercent(player.roiPct, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {svPlayers.length > 0 && (
          <p className="table-note">
            {svPlayers.length} SV in questa giornata: contributo individuale 0%, esclusi dalla media squadra come da policy PLAYER_ZERO_TEAM_EXCLUDE.
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'neutral' }) {
  return (
    <div className={`fantalive-summary-card fantalive-tone-${tone}`}>
      <span className="fantalive-eyebrow">{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function PlayerHighlightCard({
  title,
  tone,
  players,
  onSelectPlayer,
}: {
  title: string;
  tone: 'green' | 'red';
  players: PlayerRoundSnapshot[];
  onSelectPlayer?: (player: PlayerRoundSnapshot) => void;
}) {
  return (
    <div className={`fantalive-highlight card fantalive-highlight-${tone}`}>
      <div className="fantalive-highlight-head">
        <h3>{title}</h3>
        <span className={`badge ${tone === 'green' ? 'badge-green' : 'badge-red'}`}>{players.length}</span>
      </div>
      <ul className="fantalive-highlight-list">
        {players.length === 0 && <li className="empty-state">Nessun dato in questa giornata.</li>}
        {players.map(player => {
          const events = eventBadges(player);
          return (
            <li
              key={player.playerId}
              className="fantalive-highlight-item clickable-row"
              onClick={() => onSelectPlayer?.(player)}
            >
              <div className="fantalive-highlight-main">
                <span className="role-badge">{player.role}</span>
                <div>
                  <strong>{player.name}</strong>
                  <small>{player.club}</small>
                </div>
              </div>
              <div className="fantalive-highlight-stats">
                <div>
                  <span className="fantalive-eyebrow">Voto</span>
                  <strong>{player.isSv ? 'SV' : (player.vote ?? 0).toFixed(1).replace('.', ',')}</strong>
                </div>
                <div>
                  <span className="fantalive-eyebrow">Bonus FT</span>
                  <strong className={valueTone(player.fantasyBonusPct)}>{formatSignedPercent(player.fantasyBonusPct, 2)}</strong>
                </div>
                <div>
                  <span className="fantalive-eyebrow">Contributo</span>
                  <strong className={valueTone(player.profitLoss)}>{formatSignedCredits(player.profitLoss, 2)}</strong>
                </div>
              </div>
              <div className="fantalive-highlight-events">
                {events.map(badge => (
                  <span key={badge.label} className={`event-badge event-badge-${badge.tone}`}>{badge.label}</span>
                ))}
                <small className="fantalive-highlight-reason">{describePlayerContribution(player)}</small>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
