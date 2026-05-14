import { useEffect, useMemo, useState } from 'react';
import {
  FantaTradingApi,
  getDemoAccessTokenForEmail,
  type BackendPlayer,
  type BackendPortfolio,
  type BackendVote,
} from '../api';
import { EmptyState, MetricCard, Section, StatusBadges } from '../components';
import PlayerTrendChart from './PlayerTrendChart';
import TeamTrendChart from './TeamTrendChart';
import {
  calculatePositionValue,
  roleLimits,
  roleNames,
  type DemoPosition,
  type FavcRole,
} from '../mock/favcDemoData';
import { formatCredits, formatSignedCredits, formatSignedPercent, valueTone } from '../utils/format';
import {
  mergeVotesIntoTrend,
  normalizeSyntheticTrend,
  type RawSyntheticRoundQuote,
  type RawVoteRow,
} from '../utils/playerTrend';
import { buildTeamTrendFromPositions, type TeamTrendPoint } from '../utils/teamTrend';

type Props = {
  seasonId?: string | null;
  seasonLabel?: string;
};

type DemoTeamConfig = {
  key: 'VALUE' | 'LOW_COST' | 'TOP_PLAYER' | 'BALANCED';
  label: string;
  shortLabel: string;
  email: string;
  description: string;
};

type LoadedDemoTeam = DemoTeamConfig & {
  teamId: string;
  positions: DemoPosition[];
  totalCapitalDeposited: number;
  virtualCashBalance: number;
  trend: TeamTrendPoint[];
  maxRound: number;
};

const DEMO_TEAMS: DemoTeamConfig[] = [
  {
    key: 'VALUE',
    label: 'Team Demo VALUE',
    shortLabel: 'VALUE',
    email: 'demo-value@fantatrading.local',
    description: 'Rapporto trend/prezzo',
  },
  {
    key: 'LOW_COST',
    label: 'Team Demo LOW COST',
    shortLabel: 'LOW COST',
    email: 'demo-lowcost@fantatrading.local',
    description: 'Rosa economica',
  },
  {
    key: 'TOP_PLAYER',
    label: 'Team Demo TOP PLAYER',
    shortLabel: 'TOP PLAYER',
    email: 'demo-top@fantatrading.local',
    description: 'Quote piu alte',
  },
  {
    key: 'BALANCED',
    label: 'Team Demo BALANCED',
    shortLabel: 'BALANCED',
    email: 'demo-balanced@fantatrading.local',
    description: 'Equilibrio ruolo/prezzo/trend',
  },
];

const syntheticQuoteModules = import.meta.glob<{ rows: RawSyntheticRoundQuote[] }>(
  '@data/real/processed/round-quotes/synthetic_round_quotes_history.json',
  { import: 'default' },
);

async function loadSyntheticQuoteRows() {
  const loaders = Object.values(syntheticQuoteModules);
  if (loaders.length === 0) return [];
  const report = await loaders[0]();
  return report.rows ?? [];
}

function mapBackendRole(role: string): FavcRole {
  if (role === 'GK' || role === 'P') return 'P';
  if (role === 'DEF' || role === 'D') return 'D';
  if (role === 'MID' || role === 'C') return 'C';
  return 'A';
}

function backendPlayerName(player: BackendPlayer) {
  return [player.firstName, player.lastName].filter(Boolean).join(' ').trim() || player.lastName || player.id;
}

function votesToRows(votes: BackendVote[]): RawVoteRow[] {
  return votes.map(vote => ({
    round: vote.round,
    playerId: vote.playerId,
    vote: vote.vote ?? null,
    fantasyVote: vote.fantasyVote ?? null,
  }));
}

function normalizePositions(
  portfolio: BackendPortfolio,
  players: BackendPlayer[],
  syntheticRows: RawSyntheticRoundQuote[],
  voteRows: RawVoteRow[],
) {
  return portfolio.positions.map<DemoPosition>(position => {
    const player = players.find(item => item.id === position.playerId);
    const initialQuote = Number(position.initialQuote || position.buyPrice || position.currentQuote || 1);
    const currentQuote = Number(position.currentQuote || initialQuote);
    const playerName = position.playerName || (player ? backendPlayerName(player) : position.playerId);
    const externalOrBackendId = player?.externalId ?? position.playerId;

    return {
      id: position.id,
      playerId: externalOrBackendId,
      playerName,
      realTeam: player?.realTeam ?? 'Backend',
      role: mapBackendRole(position.role),
      initialQuote,
      currentQuote,
      fantasyMultiplier: Number(position.fantasyMultiplier || 1),
      status: position.isActive ? 'ACTIVE' : 'SOLD',
      trend: mergeVotesIntoTrend(
        normalizeSyntheticTrend(syntheticRows, externalOrBackendId, {
          initialQuote,
          currentQuote,
          playerName,
        }),
        voteRows,
        position.playerId,
      ),
    };
  });
}

function countRoles(positions: DemoPosition[]) {
  return positions.filter(position => position.status === 'ACTIVE').reduce(
    (counts, position) => ({ ...counts, [position.role]: counts[position.role] + 1 }),
    { P: 0, D: 0, C: 0, A: 0 } as Record<FavcRole, number>,
  );
}

function snapshotAt(team: LoadedDemoTeam, round: number) {
  const trendPoint = team.trend.find(point => point.round === round)
    ?? team.trend.filter(point => point.round <= round).at(-1)
    ?? team.trend[0]
    ?? { round: 0, totalValue: 0, portfolioValue: 0, roiPct: 0 };

  return {
    round: trendPoint.round,
    portfolioValue: trendPoint.portfolioValue,
    totalValue: trendPoint.totalValue,
    roiPct: trendPoint.roiPct,
    profitLoss: trendPoint.totalValue - team.totalCapitalDeposited,
  };
}

function getPlayerRoi(position: DemoPosition, round: number) {
  const point = position.trend?.find(item => item.round === round)
    ?? position.trend?.filter(item => item.round <= round).at(-1)
    ?? position.trend?.[0];
  if (!point || position.initialQuote <= 0) return 0;
  return ((point.estimatedValue - position.initialQuote) / position.initialQuote) * 100;
}

export default function SeasonSimulationPanel({ seasonId, seasonLabel = '2025/26' }: Props) {
  const [teams, setTeams] = useState<LoadedDemoTeam[]>([]);
  const [selectedKey, setSelectedKey] = useState<DemoTeamConfig['key']>('VALUE');
  const [roundByTeam, setRoundByTeam] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [message, setMessage] = useState('Carico squadre demo 2025/26...');

  useEffect(() => {
    let mounted = true;

    async function loadTeams() {
      if (!seasonId) {
        setStatus('empty');
        setMessage('Stagione 2025/26 non disponibile: esegui il seed demo 2025/26.');
        return;
      }

      setStatus('loading');
      setMessage('Carico squadre demo multi-utente...');

      const syntheticRows = await loadSyntheticQuoteRows().catch(() => [] as RawSyntheticRoundQuote[]);
      let sharedPlayers: BackendPlayer[] = [];
      let sharedVotes: BackendVote[] = [];
      const loaded: LoadedDemoTeam[] = [];

      for (const config of DEMO_TEAMS) {
        const token = await getDemoAccessTokenForEmail(config.email);
        if (!token) continue;

        const api = new FantaTradingApi({ token });
        if (sharedPlayers.length === 0) {
          const [playersResult, votesResult] = await Promise.all([
            api.getPlayers({ seasonId }),
            api.getVotes({ seasonId }),
          ]);
          sharedPlayers = playersResult.ok ? playersResult.data : [];
          sharedVotes = votesResult.ok ? votesResult.data : [];
        }

        const teamsResult = await api.getMyTeams();
        if (!teamsResult.ok) continue;
        const team = teamsResult.data.find(item => item.seasonId === seasonId);
        if (!team) continue;

        const portfolioResult = await api.getTeamPortfolio(team.id);
        if (!portfolioResult.ok) continue;

        const positions = normalizePositions(portfolioResult.data, sharedPlayers, syntheticRows, votesToRows(sharedVotes));
        const totalCapitalDeposited = Number(portfolioResult.data.summary.totalCapitalDeposited ?? team.initialBudget ?? 0);
        const virtualCashBalance = Number(portfolioResult.data.summary.virtualCashBalance ?? team.availableBudget ?? 0);
        const trend = buildTeamTrendFromPositions(positions, {
          virtualCashBalance,
          totalCapitalDeposited,
          lastRounds: 38,
        });

        loaded.push({
          ...config,
          teamId: team.id,
          positions,
          totalCapitalDeposited,
          virtualCashBalance,
          trend,
          maxRound: trend.at(-1)?.round ?? 1,
        });
      }

      if (!mounted) return;
      setTeams(loaded);
      setRoundByTeam(Object.fromEntries(loaded.map(team => [team.key, 1])));
      if (loaded.length === 0) {
        setStatus('empty');
        setMessage('Nessuna squadra demo multi trovata. Esegui npm.cmd run backend:seed:demo:2025-26:multi.');
        return;
      }

      setStatus('ready');
      setMessage('Squadre demo 2025/26 caricate. Avanza giornata e classifica sono simulazioni locali: non modificano il database.');
    }

    loadTeams().catch((error) => {
      if (!mounted) return;
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Errore nel caricamento delle squadre demo.');
    });

    return () => {
      mounted = false;
    };
  }, [seasonId]);

  const selectedTeam = teams.find(team => team.key === selectedKey) ?? teams[0];
  const selectedRound = selectedTeam ? roundByTeam[selectedTeam.key] ?? 1 : 1;
  const selectedSnapshot = selectedTeam ? snapshotAt(selectedTeam, selectedRound) : null;
  const ranking = useMemo(() => (
    teams
      .map(team => ({ team, snapshot: snapshotAt(team, roundByTeam[team.key] ?? 1) }))
      .sort((a, b) => b.snapshot.roiPct - a.snapshot.roiPct)
  ), [roundByTeam, teams]);
  const selectedTrend = selectedTeam
    ? selectedTeam.trend.filter(point => point.round <= selectedRound)
    : [];
  const selectedCounts = selectedTeam ? countRoles(selectedTeam.positions) : { P: 0, D: 0, C: 0, A: 0 };
  const topPlayers = selectedTeam
    ? [...selectedTeam.positions]
        .filter(position => position.status === 'ACTIVE')
        .sort((a, b) => getPlayerRoi(b, selectedRound) - getPlayerRoi(a, selectedRound))
        .slice(0, 8)
    : [];

  function advanceSelected() {
    if (!selectedTeam) return;
    setRoundByTeam(current => ({
      ...current,
      [selectedTeam.key]: Math.min(selectedTeam.maxRound, (current[selectedTeam.key] ?? 1) + 1),
    }));
  }

  function advanceAll() {
    setRoundByTeam(current => Object.fromEntries(
      teams.map(team => [team.key, Math.min(team.maxRound, (current[team.key] ?? 1) + 1)]),
    ));
  }

  function resetRounds() {
    setRoundByTeam(Object.fromEntries(teams.map(team => [team.key, 1])));
  }

  return (
    <>
      <Section title="Simulazione stagione 2025/26">
        <div className="backend-banner trade-status trade-status-info">
          <strong>{status === 'ready' ? 'Demo multi-squadra' : 'Stato simulazione'}</strong>
          <span>{message}</span>
        </div>

        <div className="simulation-toolbar">
          <StatusBadges items={['Stagione 2025/26', 'Ranking ROI%', 'Trend synthetic', 'Nessun payout reale']} />
          <div className="simulation-controls">
            <label>
              Squadra demo
              <select
                value={selectedTeam?.key ?? selectedKey}
                onChange={event => setSelectedKey(event.target.value as DemoTeamConfig['key'])}
                disabled={teams.length === 0}
              >
                {DEMO_TEAMS.map(team => <option value={team.key} key={team.key}>{team.shortLabel}</option>)}
              </select>
            </label>
            <button type="button" className="favc-action" onClick={advanceSelected} disabled={!selectedTeam || selectedRound >= selectedTeam.maxRound}>
              Avanza giornata
            </button>
            <button type="button" className="favc-action" onClick={advanceAll} disabled={teams.length === 0}>
              Avanza tutte le squadre
            </button>
            <button type="button" className="favc-action muted" onClick={resetRounds} disabled={teams.length === 0}>
              Reset G1
            </button>
          </div>
        </div>

        {status !== 'ready' && (
          <EmptyState
            title="Squadre demo multi non pronte"
            text="Il fallback mock della pagina resta attivo, ma il confronto multi-team richiede il seed 2025/26 multi."
          />
        )}
      </Section>

      {selectedTeam && selectedSnapshot && (
        <>
          <div className="metric-grid favc-metric-grid">
            <MetricCard label="Squadra" value={selectedTeam.shortLabel} sub={selectedTeam.description} color="var(--accent)" />
            <MetricCard label="Giornata" value={`G${selectedSnapshot.round}`} sub={`max G${selectedTeam.maxRound}`} color="var(--amber)" />
            <MetricCard label="Capitale virtuale" value={formatCredits(selectedTeam.totalCapitalDeposited)} sub="totalCapitalDeposited" color="var(--teal)" />
            <MetricCard label="Valore squadra" value={formatCredits(selectedSnapshot.totalValue)} sub="rosa + cash virtuale" color="var(--accent)" />
            <MetricCard label="Profit/Loss" value={formatSignedCredits(selectedSnapshot.profitLoss)} sub="simulato al round" color={selectedSnapshot.profitLoss >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricCard label="ROI%" value={formatSignedPercent(selectedSnapshot.roiPct)} sub="classifica principale" color={selectedSnapshot.roiPct >= 0 ? 'var(--green)' : 'var(--red)'} />
          </div>

          <div className="favc-dashboard-grid">
            <Section title="Confronto valore squadra">
              <div className="card chart-card">
                <TeamTrendChart data={selectedTrend} valueKey="totalValue" />
              </div>
            </Section>
            <Section title="Confronto ROI%">
              <div className="card chart-card">
                <TeamTrendChart data={selectedTrend} valueKey="roiPct" />
              </div>
            </Section>
          </div>

          <div className="favc-dashboard-grid">
            <Section title="Classifica ROI% demo">
              <div className="card table-scroll">
                <table className="compact-table">
                  <thead><tr><th>#</th><th>Team</th><th>Giornata</th><th>Valore</th><th>P/L</th><th>ROI%</th></tr></thead>
                  <tbody>
                    {ranking.map((item, index) => (
                      <tr key={item.team.key} className={item.team.key === selectedTeam.key ? 'selected-row' : ''}>
                        <td>{index + 1}</td>
                        <td><strong>{item.team.shortLabel}</strong><span className="table-subline">{item.team.description}</span></td>
                        <td>G{item.snapshot.round}</td>
                        <td>{formatCredits(item.snapshot.totalValue)}</td>
                        <td className={valueTone(item.snapshot.profitLoss)}>{formatSignedCredits(item.snapshot.profitLoss)}</td>
                        <td className={valueTone(item.snapshot.roiPct)}>{formatSignedPercent(item.snapshot.roiPct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Composizione selezionata">
              <div className="card composition-card">
                {(['P', 'D', 'C', 'A'] as FavcRole[]).map(role => (
                  <div className="builder-progress-item" key={role}>
                    <span>{roleNames[role]}</span>
                    <strong>{selectedCounts[role]}/{roleLimits[role]}</strong>
                    <div className="builder-progress-bar">
                      <span style={{ width: `${Math.min(100, (selectedCounts[role] / roleLimits[role]) * 100)}%` }} />
                    </div>
                  </div>
                ))}
                <div className="table-note">
                  Avanzare giornata e classifica sono calcoli locali su trend sintetico 2025/26. Nessuna MarketOperation viene creata.
                </div>
              </div>
            </Section>
          </div>

          <Section title="Anteprima giocatori selezionati">
            <div className="card table-scroll">
              <table className="portfolio-table compact-table simulation-player-table">
                <thead><tr><th>Trend</th><th>Giocatore</th><th>Club</th><th>Ruolo</th><th>Quota</th><th>Valore att.</th><th>ROI round</th></tr></thead>
                <tbody>
                  {topPlayers.map(player => {
                    const roundPoint = player.trend?.find(point => point.round === selectedRound)
                      ?? player.trend?.filter(point => point.round <= selectedRound).at(-1);
                    const roi = getPlayerRoi(player, selectedRound);
                    return (
                      <tr key={player.id}>
                        <td className="mini-trend-cell wide"><PlayerTrendChart data={player.trend?.filter(point => point.round <= selectedRound) ?? []} mode="mini" /></td>
                        <td><strong>{player.playerName}</strong></td>
                        <td>{player.realTeam}</td>
                        <td><span className="role-badge">{player.role}</span></td>
                        <td>{formatCredits(roundPoint?.quote ?? player.currentQuote)}</td>
                        <td>{formatCredits(roundPoint?.estimatedValue ?? calculatePositionValue(player))}</td>
                        <td className={valueTone(roi)}>{formatSignedPercent(roi)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </>
  );
}
