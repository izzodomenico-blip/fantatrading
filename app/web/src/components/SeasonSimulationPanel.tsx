import { useEffect, useMemo, useState } from 'react';
import {
  createFantaTradingApi,
  FantaTradingApi,
  getDemoAccessTokenForEmail,
  type BackendPlayer,
  type BackendPortfolio,
  type BackendVote,
} from '../api';
import { Link } from 'react-router-dom';
import { EmptyState, MetricCard, Section, StatusBadges } from '../components';
import type { PlayerCardData } from './PlayerCard';
import PlayerDetailDrawer from './PlayerDetailDrawer';
import PlayerTrendChart from './PlayerTrendChart';
import TeamTrendChart from './TeamTrendChart';
import {
  roleLimits,
  roleNames,
  type FavcRole,
} from '../mock/favcDemoData';
import { formatCredits, formatSignedCredits, formatSignedPercent, valueTone } from '../utils/format';
import {
  buildPlayerRoundMemory,
  type PlayerRoundMemory,
  type RawSyntheticRoundQuote,
  type RawVoteRow,
} from '../utils/playerRoundMemory';
import {
  buildRoundLog,
  buildTeamReplay,
  type PlayerRoundSnapshot,
  type ReplayPosition,
  type TeamRoundSnapshot,
} from '../utils/teamRoundSimulation';
import {
  advanceRound,
  clampRound,
  previousRound,
  rankTeamsByRoi,
  readReplayState,
  resetRound,
  writeReplayState,
  readActiveSimulationTeam,
  setActiveSimulationTeam,
} from '../utils/seasonReplay';
import type { TeamTrendPoint } from '../utils/teamTrend';

type Props = {
  seasonId?: string | null;
  seasonLabel?: string;
};

type DemoTeamConfig = {
  key: string;
  label: string;
  shortLabel: string;
  email: string;
  description: string;
  kind?: 'active' | 'demo';
};

type LoadedDemoTeam = DemoTeamConfig & {
  teamId: string;
  positions: ReplayPosition[];
  roundMemory: Map<string, PlayerRoundMemory>;
  replay: TeamRoundSnapshot[];
  maxRound: number;
  quoteSource: 'official' | 'synthetic' | 'mock';
  voteMaxRound: number;
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

const ACTIVE_TEAM_KEY = 'MY_TEAM';

const STORAGE_KEY = 'fantatrading_season_replay_2025_26';
const TARGET_MAX_ROUND = 36;

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
    played: vote.played,
    goals: vote.goals ?? null,
    assists: vote.assists ?? null,
    yellowCards: vote.yellowCards ?? null,
    redCards: vote.redCards ?? null,
    ownGoals: vote.ownGoals ?? null,
    penaltySaved: vote.penaltySaved ?? null,
    penaltyMissed: vote.penaltyMissed ?? null,
  }));
}

function normalizePositions(portfolio: BackendPortfolio, players: BackendPlayer[]) {
  return portfolio.positions.map<ReplayPosition>(position => {
    const player = players.find(item => item.id === position.playerId);
    const initialQuote = Number(position.initialQuote || position.buyPrice || position.currentQuote || 1);
    const currentQuote = Number(position.currentQuote || initialQuote);
    const playerName = position.playerName || (player ? backendPlayerName(player) : position.playerId);

    return {
      id: position.id,
      backendPlayerId: position.playerId,
      playerId: player?.externalId ?? position.playerId,
      playerName,
      realTeam: player?.realTeam ?? 'Backend',
      role: mapBackendRole(position.role),
      initialQuote,
      currentQuote,
      fantasyMultiplier: Number(position.fantasyMultiplier || 1),
      status: position.isActive ? 'ACTIVE' : 'SOLD',
    };
  });
}

function countRoles(positions: ReplayPosition[]) {
  return positions.filter(position => position.status === 'ACTIVE').reduce(
    (counts, position) => ({ ...counts, [position.role]: counts[position.role] + 1 }),
    { P: 0, D: 0, C: 0, A: 0 } as Record<FavcRole, number>,
  );
}

function snapshotAt(team: LoadedDemoTeam, round: number) {
  return team.replay.find(point => point.round === round)
    ?? team.replay.filter(point => point.round <= round).at(-1)
    ?? team.replay[0]
    ?? null;
}

function replayToTrend(replay: TeamRoundSnapshot[], round: number, range: '5' | '10' | 'all'): TeamTrendPoint[] {
  const visible = replay.filter(point => point.round <= round);
  const ranged = range === 'all' ? visible : visible.slice(-Number(range));
  return ranged.map(point => ({
    round: point.round,
    portfolioValue: point.grossPositionsValue,
    totalValue: point.finalLiquidationValue,
    roiPct: point.roiPct,
    teamVoteAverage: point.teamVoteAverage,
  }));
}

function playerSnapshotToCard(snapshot: PlayerRoundSnapshot, replay: TeamRoundSnapshot[]): PlayerCardData {
  const historicalTrend = replay
    .map(point => {
      const player = point.playerSnapshots.find(item => item.playerId === snapshot.playerId);
      return player ? {
        round: point.round,
        quote: player.quote,
        quoteChange: player.quoteChange,
        fantaTradingReturnPct: player.roiPct,
        estimatedValue: player.estimatedValue,
        vote: player.vote,
        fantasyVote: player.fantasyVote,
        played: player.played,
        isSv: player.isSv,
        fantasyBonusPct: player.fantasyBonusPct,
        source: player.sourceQuote,
        sourceVote: player.sourceVote,
      } : null;
    })
    .filter(Boolean) as PlayerCardData['trend'];
  const initialQuote = historicalTrend[0]?.quote ?? snapshot.quote;
  return {
    id: snapshot.playerId,
    playerName: snapshot.name,
    realTeam: snapshot.club,
    role: snapshot.role as FavcRole,
    initialQuote,
    currentQuote: snapshot.quote,
    fantasyMultiplier: 1,
    status: 'ACTIVE',
    trend: historicalTrend.length > 0 ? historicalTrend : snapshot.trend,
  };
}

export default function SeasonSimulationPanel({ seasonId, seasonLabel = '2025/26' }: Props) {
  const [teams, setTeams] = useState<LoadedDemoTeam[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>(ACTIVE_TEAM_KEY);
  const [roundByTeam, setRoundByTeam] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [message, setMessage] = useState('Carico replay storico 2025/26...');
  const [graphRange, setGraphRange] = useState<'5' | '10' | 'all'>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCardData | null>(null);

  useEffect(() => {
    const stored = readReplayState(typeof window === 'undefined' ? undefined : window.localStorage, STORAGE_KEY);
    if (stored?.selectedTeam) {
      setSelectedKey(stored.selectedTeam);
    }
    if (stored?.currentRoundByTeam) {
      setRoundByTeam(stored.currentRoundByTeam);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadTeams() {
      if (!seasonId) {
        setStatus('empty');
        setMessage('Stagione 2025/26 non disponibile: esegui il seed demo 2025/26.');
        return;
      }
      const replaySeasonId = seasonId;

      setStatus('loading');
      setMessage('Carico squadre demo, voti reali e memoria round-by-round...');

      const syntheticRows = await loadSyntheticQuoteRows().catch(() => [] as RawSyntheticRoundQuote[]);
      let sharedPlayers: BackendPlayer[] = [];
      let sharedVotes: BackendVote[] = [];
      const loaded: LoadedDemoTeam[] = [];
      const activeFromStorage = readActiveSimulationTeam(typeof window === 'undefined' ? undefined : window.localStorage);
      const query = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
      const activeTeamId = query.get('teamId') ?? activeFromStorage?.teamId ?? null;

      async function buildLoadedTeam(config: DemoTeamConfig, api: FantaTradingApi, teamId: string) {
        if (sharedPlayers.length === 0) {
          const [playersResult, votesResult] = await Promise.all([
            api.getPlayers({ seasonId: replaySeasonId }),
            api.getVotes({ seasonId: replaySeasonId }),
          ]);
          sharedPlayers = playersResult.ok ? playersResult.data : [];
          sharedVotes = votesResult.ok ? votesResult.data : [];
        }

        const portfolioResult = await api.getTeamPortfolio(teamId);
        if (!portfolioResult.ok) return null;

        const positions = normalizePositions(portfolioResult.data, sharedPlayers);
        const votesMaxRound = Math.max(0, ...sharedVotes.map(vote => Number(vote.round)).filter(Number.isFinite));
        const maxRound = Math.min(TARGET_MAX_ROUND, votesMaxRound || TARGET_MAX_ROUND);
        const totalCapitalDeposited = Number(portfolioResult.data.summary.totalCapitalDeposited ?? portfolioResult.data.team.initialBudget ?? 0);
        const virtualCashBalance = Number(portfolioResult.data.summary.virtualCashBalance ?? portfolioResult.data.team.availableBudget ?? 0);
        const memoryInputs = positions.map(position => ({
          playerId: position.playerId ?? position.id,
          backendPlayerId: position.backendPlayerId,
          externalId: position.playerId,
          playerName: position.playerName,
          role: position.role,
          club: position.realTeam,
          season: seasonLabel,
          initialQuote: position.initialQuote,
          currentQuote: position.currentQuote,
          fantasyMultiplier: position.fantasyMultiplier,
        }));
        const roundMemory = buildPlayerRoundMemory(memoryInputs, votesToRows(sharedVotes), syntheticRows, {
          season: seasonLabel,
          maxRound,
        });
        const replay = buildTeamReplay({
          teamId,
          seasonId: replaySeasonId,
          virtualCashBalance,
          totalCapitalDeposited,
        }, positions, roundMemory, maxRound);
        const quoteSource = Array.from(roundMemory.values()).some(memory => memory.rounds.some(point => point.sourceQuote === 'synthetic'))
          ? 'synthetic'
          : 'mock';

        return {
          ...config,
          teamId,
          positions,
          roundMemory,
          replay,
          maxRound,
          quoteSource,
          voteMaxRound: maxRound,
        } as LoadedDemoTeam;
      }

      if (activeTeamId) {
        const activeTeam = await buildLoadedTeam({
          key: ACTIVE_TEAM_KEY,
          label: 'La mia rosa attiva',
          shortLabel: 'La mia rosa',
          email: '',
          description: 'Squadra salvata dalla creazione rosa',
          kind: 'active',
        }, createFantaTradingApi(), activeTeamId);
        if (activeTeam) {
          loaded.push(activeTeam);
          setActiveSimulationTeam(typeof window === 'undefined' ? undefined : window.localStorage, activeTeam.teamId, replaySeasonId, activeFromStorage?.round ?? 1);
        }
      }

      for (const config of DEMO_TEAMS) {
        const token = await getDemoAccessTokenForEmail(config.email);
        if (!token) continue;

        const api = new FantaTradingApi({ token });
        const teamsResult = await api.getMyTeams();
        if (!teamsResult.ok) continue;
        const team = teamsResult.data.find(item => item.seasonId === replaySeasonId);
        if (!team) continue;
        const demoTeam = await buildLoadedTeam({ ...config, kind: 'demo' }, api, team.id);
        if (demoTeam) loaded.push(demoTeam);
      }

      if (!mounted) return;
      const stored = readReplayState(typeof window === 'undefined' ? undefined : window.localStorage, STORAGE_KEY);
      setTeams(loaded);
      setRoundByTeam(current => Object.fromEntries(loaded.map(team => [
        team.key,
        clampRound(current[team.key] ?? stored?.currentRoundByTeam?.[team.key] ?? activeFromStorage?.round ?? 1, team.maxRound),
      ])));
      if (loaded.length === 0) {
        setStatus('empty');
        setMessage('Nessuna squadra demo multi trovata. Esegui npm.cmd run backend:seed:demo:2025-26:multi.');
        return;
      }

      setStatus('ready');
      if (loaded.some(team => team.key === ACTIVE_TEAM_KEY)) {
        setSelectedKey(ACTIVE_TEAM_KEY);
      }
      setMessage(`Replay storico 2025/26 pronto: voti reali fino a G${loaded[0].voteMaxRound}, quote sintetiche operative se manca QuoteHistory ufficiale.`);
    }

    loadTeams().catch((error) => {
      if (!mounted) return;
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Errore nel caricamento del replay storico.');
    });

    return () => {
      mounted = false;
    };
  }, [seasonId, seasonLabel]);

  useEffect(() => {
    writeReplayState(typeof window === 'undefined' ? undefined : window.localStorage, STORAGE_KEY, {
      selectedTeam: selectedKey,
      teamIdByKey: Object.fromEntries(teams.map(team => [team.key, team.teamId])),
      currentRoundByTeam: roundByTeam,
    });
  }, [roundByTeam, selectedKey, teams]);

  const activeTeam = teams.find(team => team.key === ACTIVE_TEAM_KEY);
  const selectedTeam = teams.find(team => team.key === selectedKey) ?? activeTeam ?? teams[0];
  const maxRound = selectedTeam?.maxRound ?? TARGET_MAX_ROUND;
  const selectedRound = selectedTeam ? clampRound(roundByTeam[selectedTeam.key] ?? 1, selectedTeam.maxRound) : 1;
  const selectedSnapshot = selectedTeam ? snapshotAt(selectedTeam, selectedRound) : null;
  const demoTeams = teams.filter(team => team.kind !== 'active');
  const ranking = useMemo(() => rankTeamsByRoi(
    demoTeams
      .map(team => ({ team, snapshot: snapshotAt(team, roundByTeam[team.key] ?? 1) }))
      .filter((item): item is { team: LoadedDemoTeam; snapshot: TeamRoundSnapshot } => Boolean(item.snapshot)),
  ), [roundByTeam, demoTeams]);
  const selectedTrend = selectedTeam ? replayToTrend(selectedTeam.replay, selectedRound, graphRange) : [];
  const selectedCounts = selectedTeam ? countRoles(selectedTeam.positions) : { P: 0, D: 0, C: 0, A: 0 };
  const quoteSynthetic = selectedTeam?.quoteSource === 'synthetic';

  function updateSelectedRound(nextRound: number) {
    if (!selectedTeam) return;
    setRoundByTeam(current => ({
      ...current,
      [selectedTeam.key]: clampRound(nextRound, selectedTeam.maxRound),
    }));
    if (selectedTeam.key === ACTIVE_TEAM_KEY) {
      setActiveSimulationTeam(typeof window === 'undefined' ? undefined : window.localStorage, selectedTeam.teamId, seasonId ?? '', clampRound(nextRound, selectedTeam.maxRound));
    }
  }

  function advanceSelected() {
    if (!selectedTeam) return;
    updateSelectedRound(advanceRound(selectedRound, selectedTeam.maxRound));
  }

  function previousSelected() {
    updateSelectedRound(previousRound(selectedRound));
  }

  function advanceAll() {
    setRoundByTeam(current => Object.fromEntries(
      teams.map(team => [team.key, advanceRound(current[team.key] ?? 1, team.maxRound)]),
    ));
  }

  function resetRounds() {
    setRoundByTeam(Object.fromEntries(teams.map(team => [team.key, resetRound()])));
  }

  return (
    <>
      <Section title="Simulazione storica 2025/26">
        <div className="backend-banner trade-status trade-status-info">
          <strong>{status === 'ready' ? `Giornata corrente ${selectedRound} / ${maxRound}` : 'Stato replay'}</strong>
          <span>{message}</span>
        </div>

        <div className="simulation-toolbar">
          <StatusBadges items={[
            'Voti reali fino a G36',
            quoteSynthetic ? 'Quote sintetiche' : 'Quote official/mock',
            'Ranking ROI%',
            'Nessun payout reale',
          ]} />
          <div className="simulation-controls replay-controls">
            <label>
              Team attivo
              <select
                value={selectedTeam?.key ?? selectedKey}
                onChange={event => setSelectedKey(event.target.value)}
                disabled={teams.length === 0}
              >
                {teams.map(team => <option value={team.key} key={team.key}>{team.shortLabel}</option>)}
              </select>
            </label>
            <Link className="favc-action" to="/partecipante-favc/crea-squadra">Torna a crea squadra</Link>
            <button type="button" className="favc-action" onClick={() => updateSelectedRound(1)} disabled={!selectedTeam}>
              Avvia simulazione
            </button>
            <button type="button" className="favc-action" onClick={previousSelected} disabled={!selectedTeam || selectedRound <= 1}>
              Torna indietro
            </button>
            <button type="button" className="favc-action" onClick={advanceSelected} disabled={!selectedTeam || selectedRound >= maxRound}>
              Avanza giornata
            </button>
            <button type="button" className="favc-action" onClick={advanceAll} disabled={teams.length === 0}>
              Avanza tutte le squadre
            </button>
            <button type="button" className="favc-action muted" onClick={resetRounds} disabled={teams.length === 0}>
              Reset G1
            </button>
            <label className="round-slider-label">
              Giornata {selectedRound}
              <input
                type="range"
                min="1"
                max={maxRound}
                value={selectedRound}
                onChange={event => updateSelectedRound(Number(event.target.value))}
                disabled={!selectedTeam}
              />
            </label>
          </div>
          <div className="table-note">
            Andamento quote stimato nel pilot. Voti e presenze reali fino alla giornata 36. La simulazione e visuale e non modifica database, MarketOperation, cash o roster.
          </div>
        </div>

        {status !== 'ready' && (
          <EmptyState
            title="Replay storico non pronto"
            text="Il confronto multi-team richiede il seed 2025/26 multi e backend acceso."
          />
        )}
        {status === 'ready' && !activeTeam && (
          <EmptyState
            title="Crea o seleziona prima una rosa"
            text="La mia simulazione usa il teamId salvato dopo la creazione squadra. Il confronto demo resta disponibile sotto."
          />
        )}
      </Section>

      {selectedTeam && selectedSnapshot && (
        <>
          <Section title={selectedTeam.kind === 'active' ? 'La mia simulazione' : 'Replay squadra demo'}>
            <div className="active-team-card card">
              <div><span>Squadra attiva</span><strong>{selectedTeam.label}</strong></div>
              <div><span>Stagione</span><strong>{seasonLabel}</strong></div>
              <div><span>Team ID</span><strong>{selectedTeam.teamId.slice(0, 8)}...</strong></div>
              <div><span>Giocatori</span><strong>{selectedTeam.positions.filter(player => player.status === 'ACTIVE').length}/25</strong></div>
              <div><span>Composizione</span><strong>{selectedCounts.P}/3 P, {selectedCounts.D}/8 D, {selectedCounts.C}/8 C, {selectedCounts.A}/6 A</strong></div>
            </div>
          </Section>

          <div className="metric-grid favc-metric-grid replay-metric-grid">
            <MetricCard label="Capitale iniziale" value={formatCredits(selectedSnapshot.totalCapitalDeposited)} sub="virtuale depositato" color="var(--teal)" />
            <MetricCard label="Speso giocatori" value={formatCredits(selectedSnapshot.totalSpentPlayers)} sub="totale quote rosa" color="var(--accent)" />
            <MetricCard label="Commissioni pagate" value={formatCredits(selectedSnapshot.buyCommissions + selectedSnapshot.sellCommissions)} sub="buy/sell fee" color="var(--amber)" />
            <MetricCard label="Budget/Cash residuo" value={formatCredits(selectedSnapshot.virtualCashBalance)} sub="cash virtuale" color="var(--green)" />
            <MetricCard label="Valore rosa" value={formatCredits(selectedSnapshot.grossPositionsValue)} sub="gross positions" color="var(--accent)" />
            <MetricCard label="Guadagno/Perdita" value={formatSignedCredits(selectedSnapshot.profitLoss)} sub="progressivo stimato" color={selectedSnapshot.profitLoss >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricCard label="Guadagno %" value={formatSignedPercent(selectedSnapshot.roiPct)} sub="rendimento % stimato" color={selectedSnapshot.roiPct >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricCard label="Media voto" value={selectedSnapshot.teamVoteAverage === null ? 'n.d.' : selectedSnapshot.teamVoteAverage.toFixed(2)} sub={selectedSnapshot.teamBandLabel.replace('_', ' ')} color="var(--purple)" />
            <MetricCard label="Con voto / SV" value={`${selectedSnapshot.playersWithVote}/${selectedSnapshot.svCount}`} sub="PLAYER_ZERO_TEAM_EXCLUDE" color="var(--amber)" />
            <MetricCard label="Migliore" value={selectedSnapshot.bestPlayer?.name ?? 'n.d.'} sub={selectedSnapshot.bestPlayer ? formatSignedPercent(selectedSnapshot.bestPlayer.roiPct) : undefined} color="var(--green)" />
            <MetricCard label="Peggiore" value={selectedSnapshot.worstPlayer?.name ?? 'n.d.'} sub={selectedSnapshot.worstPlayer ? formatSignedPercent(selectedSnapshot.worstPlayer.roiPct) : undefined} color="var(--red)" />
          </div>

          {selectedSnapshot.playersWithVote === 0 && selectedSnapshot.playerSnapshots.every(player => player.quoteChange === 0) && (
            <div className="backend-banner backend-no-team">
              <strong>Nessun dato disponibile per questa giornata</strong>
              <span>Non risultano voti validi ne variazioni quota per la rosa attiva in questo round.</span>
            </div>
          )}

          <Section title="Log giornata">
            <div className="notice-card replay-log">
              <strong>{buildRoundLog(selectedSnapshot)}</strong>
              <p>Gli SV sono esclusi dalla media squadra e hanno effetto individuale 0%.</p>
            </div>
          </Section>

          <div className="trend-range-toggle standalone-toggle">
            <button type="button" className={graphRange === '5' ? 'active' : ''} onClick={() => setGraphRange('5')}>Ultime 5</button>
            <button type="button" className={graphRange === '10' ? 'active' : ''} onClick={() => setGraphRange('10')}>Ultime 10</button>
            <button type="button" className={graphRange === 'all' ? 'active' : ''} onClick={() => setGraphRange('all')}>Tutte</button>
          </div>

          <div className="favc-dashboard-grid replay-chart-grid">
            <Section title="Andamento valore rosa">
              <div className="card chart-card">
                <TeamTrendChart data={selectedTrend} valueKey="portfolioValue" />
              </div>
            </Section>
            <Section title="Andamento ROI%">
              <div className="card chart-card">
                <TeamTrendChart data={selectedTrend} valueKey="roiPct" />
              </div>
            </Section>
            <Section title="Andamento media squadra">
              <div className="card chart-card">
                <TeamTrendChart data={selectedTrend} valueKey="teamVoteAverage" />
              </div>
            </Section>
          </div>

          <Section title="Andamento economico giornata per giornata">
            <div className="card table-scroll">
              <table className="compact-table economic-progress-table">
                <thead>
                  <tr>
                    <th>Giornata</th>
                    <th>Capitale iniziale</th>
                    <th>Capitale aggiunto</th>
                    <th>Totale speso giocatori</th>
                    <th>Commissioni acquisto</th>
                    <th>Commissioni vendita</th>
                    <th>Budget/Cash residuo</th>
                    <th>Valore rosa lordo</th>
                    <th>Valore rosa netto</th>
                    <th>Utile/Perdita</th>
                    <th>Guadagno %</th>
                    <th>Media voto</th>
                    <th>Fascia</th>
                    <th>Bonus/Malus squadra</th>
                    <th>Con voto</th>
                    <th>SV</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTeam.replay.filter(point => point.round <= selectedRound).map(point => (
                    <tr key={point.round} className={point.round === selectedRound ? 'selected-row' : ''}>
                      <td>G{point.round}</td>
                      <td>{formatCredits(point.totalCapitalDeposited)}</td>
                      <td>{formatCredits(point.capitalAdded)}</td>
                      <td>{formatCredits(point.totalSpentPlayers)}</td>
                      <td>{formatCredits(point.buyCommissions)}</td>
                      <td>{formatCredits(point.sellCommissions)}</td>
                      <td>{formatCredits(point.virtualCashBalance)}</td>
                      <td>{formatCredits(point.grossPositionsValue)}</td>
                      <td>{formatCredits(point.netLiquidationValue)}</td>
                      <td className={valueTone(point.profitLoss)}>{formatSignedCredits(point.profitLoss)}</td>
                      <td className={valueTone(point.roiPct)}>{formatSignedPercent(point.roiPct)}</td>
                      <td>{point.teamVoteAverage ?? 'n.d.'}</td>
                      <td>{point.teamBandLabel.replace('_', ' ')}</td>
                      <td className={valueTone(point.teamBandBonusMalusPct)}>{formatSignedPercent(point.teamBandBonusMalusPct)}</td>
                      <td>{point.playersWithVote}</td>
                      <td>{point.svCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="favc-dashboard-grid">
            <Section title="Confronto demo multi-squadra">
              <div className="card table-scroll">
                <table className="compact-table">
                  <thead><tr><th>#</th><th>Team</th><th>Giornata</th><th>Valore rosa</th><th>P/L</th><th>ROI%</th><th>Media</th><th>SV</th></tr></thead>
                  <tbody>
                    {ranking.map((item, index) => (
                      <tr key={item.team.key} className={item.team.key === selectedTeam.key ? 'selected-row' : ''}>
                        <td>{index + 1}</td>
                        <td><strong>{item.team.shortLabel}</strong><span className="table-subline">{item.team.description}</span></td>
                        <td>G{item.snapshot.round}</td>
                        <td>{formatCredits(item.snapshot.grossPositionsValue)}</td>
                        <td className={valueTone(item.snapshot.profitLoss)}>{formatSignedCredits(item.snapshot.profitLoss)}</td>
                        <td className={valueTone(item.snapshot.roiPct)}>{formatSignedPercent(item.snapshot.roiPct)}</td>
                        <td>{item.snapshot.teamVoteAverage ?? 'n.d.'}</td>
                        <td>{item.snapshot.svCount}</td>
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
                <div className="table-note">Ranking demo ordinato sempre per ROI%, non per valore assoluto.</div>
              </div>
            </Section>
          </div>

          <Section title="Voti e bonus giornata">
            <div className="notice-card replay-log">
              <strong>Media squadra {selectedSnapshot.teamVoteAverage ?? 'n.d.'} {'->'} {selectedSnapshot.teamBandLabel.replace('_', ' ')}</strong>
              <p>Somma voti {selectedSnapshot.teamVoteSum}. Bonus/malus medio applicato {formatSignedPercent(selectedSnapshot.teamBandBonusMalusPct)}. SV escluso dalla media squadra.</p>
            </div>
            <div className="card table-scroll">
              <table className="portfolio-table compact-table simulation-player-table">
                <thead>
                  <tr>
                    <th>Trend</th>
                    <th>Giocatore</th>
                    <th>Club</th>
                    <th>Ruolo</th>
                    <th>Quota</th>
                    <th>Delta quota</th>
                    <th>Voto</th>
                    <th>Fantavoto</th>
                    <th>Bonus/malus</th>
                    <th>Valore prima</th>
                    <th>Valore dopo</th>
                    <th>Differenza</th>
                    <th>P/L</th>
                    <th>Contributo</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSnapshot.playerSnapshots.map(player => {
                    const highlight = selectedSnapshot.topPlayers.some(item => item.playerId === player.playerId)
                      ? 'top-player-row'
                      : selectedSnapshot.bottomPlayers.some(item => item.playerId === player.playerId)
                        ? 'bottom-player-row'
                        : player.isSv ? 'sv-player-row' : '';
                    return (
                    <tr key={player.playerId} className={`clickable-row ${highlight}`} onClick={() => setSelectedPlayer(playerSnapshotToCard(player, selectedTeam.replay))}>
                      <td className="mini-trend-cell wide"><PlayerTrendChart data={player.trend.filter(point => point.round <= selectedRound)} mode="mini" /></td>
                      <td><strong>{player.name}</strong></td>
                      <td>{player.club}</td>
                      <td><span className="role-badge">{player.role}</span></td>
                      <td>{formatCredits(player.quote)}</td>
                      <td className={valueTone(player.quoteChange)}>{formatSignedCredits(player.quoteChange)}</td>
                      <td>{player.isSv ? <span className="badge badge-amber">SV</span> : player.vote}</td>
                      <td>{player.fantasyVote ?? 'n.d.'}</td>
                      <td className={valueTone(player.fantasyBonusPct)}>{formatSignedPercent(player.fantasyBonusPct)}</td>
                      <td>{formatCredits(player.valueBefore)}</td>
                      <td>{formatCredits(player.estimatedValue)}</td>
                      <td className={valueTone(player.valueDelta)}>{formatSignedCredits(player.valueDelta)}</td>
                      <td className={valueTone(player.profitLoss)}>{formatSignedCredits(player.profitLoss)}</td>
                      <td className={valueTone(player.roiPct)}>{formatSignedPercent(player.roiPct)}</td>
                    </tr>
                  );})}
                </tbody>
              </table>
              <div className="table-note">
                Click su un giocatore per vedere memoria storica completa G1-G{selectedTeam.maxRound}. Source quote: {selectedTeam.quoteSource}.
              </div>
            </div>
          </Section>
        </>
      )}

      <PlayerDetailDrawer player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </>
  );
}
