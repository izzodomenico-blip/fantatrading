import { useMemo, useState } from 'react';
import { createFantaTradingApi } from '../api';
import PlayerCard, { type PlayerCardData } from './PlayerCard';
import { EmptyState, Section, StatusBadges } from '../components';
import {
  BUY_COMMISSION_RATE,
  roleLimits,
  roleNames,
  type DemoMarketPlayer,
  type FavcRole,
} from '../mock/favcDemoData';
import {
  filterAndSortMarketPlayers,
  type MarketFilterState,
  type MarketPriceFilter,
  type MarketSortKey,
  type MarketTrendFilter,
} from '../utils/marketFilters';
import { buildRosterDraftSummary, canAddPlayerToDraft } from '../utils/teamBuilder';
import { createMockTrend } from '../utils/playerTrend';
import { setActiveSimulationTeam } from '../utils/seasonReplay';
import { formatCredits } from '../utils/format';
import {
  createLocalRoster,
  readLocalRosters,
  setActiveLocalRosterId,
  upsertLocalRoster,
  type LocalRosterPlayer,
} from '../utils/localRosters';

type TeamBuilderPanelProps = {
  players: DemoMarketPlayer[];
  seasonId?: string | null;
  seasonLabel: string;
  seasonStatus?: string | null;
  votesMaxRound?: number | null;
  trendSource?: 'official' | 'synthetic' | 'mock';
  existingTeamId?: string | null;
  backendConnected: boolean;
  onCreated: (info: { localRosterId: string; backendTeamId?: string; seasonId?: string }) => void;
  onContinueExisting: () => void;
};

const PRESETS = [150, 300, 500, 1000];
const ROLE_ORDER: FavcRole[] = ['P', 'D', 'C', 'A'];

function playerToCard(player: DemoMarketPlayer, selected: DemoMarketPlayer[]): PlayerCardData {
  const addState = canAddPlayerToDraft(player, selected);
  const initialQuote = player.trend?.[0]?.quote ?? player.quote;
  return {
    id: player.id,
    playerName: player.playerName,
    realTeam: player.realTeam,
    role: player.role,
    initialQuote,
    currentQuote: player.quote,
    fantasyMultiplier: 1,
    trend: player.trend ?? createMockTrend(initialQuote, player.quote),
    actionLabel: 'Aggiungi alla rosa',
    actionDisabled: !addState.ok,
  };
}

export default function TeamBuilderPanel({
  players,
  seasonId,
  seasonLabel,
  seasonStatus,
  votesMaxRound,
  trendSource = 'mock',
  existingTeamId,
  backendConnected,
  onCreated,
  onContinueExisting,
}: TeamBuilderPanelProps) {
  const existingLocalCount = useMemo(() => readLocalRosters().length, []);
  const [capital, setCapital] = useState(300);
  const [rosterName, setRosterName] = useState(() => `Rosa ${existingLocalCount + 1}`);
  const [buildingStarted, setBuildingStarted] = useState(true);
  const [selected, setSelected] = useState<DemoMarketPlayer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<{ tone: 'info' | 'error' | 'success'; text: string } | null>(null);
  const [filters, setFilters] = useState<MarketFilterState>({
    search: '',
    role: 'all',
    team: 'Tutte',
    price: 'all',
    trend: 'all',
    onlyWithTrend: false,
    sortBy: 'role',
  });
  const [resetExistingDemoTeam, setResetExistingDemoTeam] = useState(Boolean(existingTeamId));
  const summary = useMemo(() => buildRosterDraftSummary(selected, capital), [selected, capital]);
  const availableTeams = ['Tutte', ...Array.from(new Set(players.map(player => player.realTeam))).sort()];
  const selectedKeys = new Set(selected.map(player => player.playerId ?? player.id));
  const filteredPlayers = filterAndSortMarketPlayers(players, filters).filter(player => !selectedKeys.has(player.playerId ?? player.id));
  const inProgressNotice = seasonStatus === 'IN_PROGRESS'
    ? `Stagione ${seasonLabel} in corso - dati disponibili fino alla giornata importata${votesMaxRound ? ` ${votesMaxRound}` : ''}.`
    : `Stagione ${seasonLabel}`;

  function addPlayer(player: DemoMarketPlayer) {
    const addState = canAddPlayerToDraft(player, selected);
    if (!addState.ok) {
      setMessage({ tone: 'error', text: addState.reason ?? 'Giocatore non aggiungibile.' });
      return;
    }
    setSelected([...selected, player]);
    setMessage(null);
  }

  function removePlayer(player: DemoMarketPlayer) {
    const key = player.playerId ?? player.id;
    setSelected(selected.filter(item => (item.playerId ?? item.id) !== key));
  }

  async function confirmRoster() {
    if (!summary.isValid) {
      setMessage({ tone: 'error', text: 'Completa la rosa con composizione 3/8/8/6 prima della conferma.' });
      return;
    }
    if (!rosterName.trim()) {
      setMessage({ tone: 'error', text: 'Dai un nome alla tua rosa prima di salvare.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const localPlayers: LocalRosterPlayer[] = selected.map(player => ({
      playerId: player.playerId ?? player.id,
      backendPlayerId: player.id,
      playerName: player.playerName,
      realTeam: player.realTeam,
      role: player.role,
      initialQuote: player.quote,
    }));

    const localRoster = createLocalRoster({
      name: rosterName.trim(),
      seasonId: seasonId ?? undefined,
      seasonLabel,
      initialCapital: capital,
      initialPlayers: localPlayers,
    });

    let backendTeamId: string | undefined;
    let backendNotice = '';
    if (backendConnected && seasonId) {
      try {
        const api = createFantaTradingApi();
        const result = await api.createTeamWithRoster({
          seasonId,
          initialVirtualCapital: capital,
          playerIds: selected.map(player => player.id),
          teamName: rosterName.trim(),
          resetExistingDemoTeam,
        });
        if (result.ok) {
          backendTeamId = result.data.team.id;
          localRoster.backendTeamId = backendTeamId;
          setActiveSimulationTeam(typeof window === 'undefined' ? undefined : window.localStorage, backendTeamId, seasonId, 1);
        } else {
          backendNotice = ` Backend non scritto (${result.error}): rosa salvata solo lato client.`;
        }
      } catch (error) {
        backendNotice = error instanceof Error ? ` Backend non scritto (${error.message}): rosa salvata solo lato client.` : ' Backend non scritto: rosa salvata solo lato client.';
      }
    } else {
      backendNotice = ' Backend non collegato: rosa salvata solo lato client (replay locale completo).';
    }

    upsertLocalRoster(localRoster);
    setActiveLocalRosterId(localRoster.id);

    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem('fantatrading.justCreatedLocalRosterId', localRoster.id);
        window.sessionStorage.setItem('fantatrading.justCreatedRosterName', localRoster.name);
        window.sessionStorage.setItem('fantatrading.justCreatedAt', String(Date.now()));
      } catch {
        // sessionStorage not available; non-blocking
      }
    }

    setSubmitting(false);
    setMessage({ tone: 'success', text: `Rosa "${localRoster.name}" salvata. La simulazione partira da G1.${backendNotice}` });
    setConfirmOpen(false);
    onCreated({ localRosterId: localRoster.id, backendTeamId, seasonId: seasonId ?? undefined });
  }

  return (
    <>
      <Section title="Crea squadra FAVC">
        <StatusBadges items={['Capitale virtuale', 'Nessun denaro reale', 'Commissione acquisto 2%', backendConnected ? 'Demo backend' : 'Fallback mock']} />
        <div className="builder-flow-steps">
          <span>1. Capitale iniziale</span>
          <span>2. Scelta giocatori</span>
          <span>3. Riepilogo rosa</span>
          <span>4. Salva e simula</span>
        </div>
        <div className="backend-banner backend-no-team">
          <strong>{inProgressNotice}</strong>
          <span>
            Il mercato di costruzione usa giocatori e quote {seasonLabel}. Trend {trendSource === 'synthetic' ? 'sintetici pilot' : trendSource}.
          </span>
        </div>
        {existingTeamId && (
          <div className="backend-banner backend-no-team">
            <strong>Team demo esistente trovato</strong>
            <span>Puoi continuare la squadra attuale oppure ricostruirla dopo conferma finale. Il reset non parte mai prima della conferma.</span>
            <div className="builder-inline-actions">
              <button className="favc-action" type="button" onClick={onContinueExisting}>Continua team esistente</button>
              <label className="checkbox-filter">
                <input type="checkbox" checked={resetExistingDemoTeam} onChange={event => setResetExistingDemoTeam(event.target.checked)} />
                Ricostruisci/reset demo alla conferma
              </label>
            </div>
          </div>
        )}

        <div className="team-builder-step">
          <div className="builder-step-head">
            <h3>STEP 1 - Capitale iniziale</h3>
            <span className="badge badge-blue">Stagione {seasonLabel}</span>
          </div>
          <p>Imposta solo capitale virtuale. Non e un pagamento reale, non c'e payout reale e il capitale potra crescere automaticamente se la rosa selezionata costera di piu.</p>
          <div className="capital-picker">
            {PRESETS.map(value => (
              <button key={value} className={capital === value ? 'active' : ''} type="button" onClick={() => setCapital(value)}>{value}</button>
            ))}
            <input type="number" min="0" value={capital} onChange={event => setCapital(Number(event.target.value) || 0)} />
            <button className="button" type="button" onClick={() => setBuildingStarted(true)} disabled={buildingStarted}>
              {buildingStarted ? 'Costruzione rosa attiva' : 'Inizia costruzione rosa'}
            </button>
          </div>
        </div>
      </Section>

      {buildingStarted && (
        <>
          <div className="builder-progress card">
            {ROLE_ORDER.map(role => (
              <div className={summary.counts[role] === roleLimits[role] ? 'complete' : summary.counts[role] > roleLimits[role] ? 'invalid' : ''} key={role}>
                <span>{roleNames[role]}</span>
                <strong>{summary.counts[role]}/{roleLimits[role]}</strong>
              </div>
            ))}
            <div className={selected.length === 25 ? 'complete' : selected.length > 25 ? 'invalid' : ''}>
              <span>Totale</span>
              <strong>{selected.length}/25</strong>
            </div>
          </div>

          <div className="team-builder-layout">
            <div className="builder-market-column">
              <Section title="STEP 2 - Scelta giocatori">
                <div className="builder-suggestions">
                  <button type="button" onClick={() => setFilters({ ...filters, sortBy: 'return', trend: 'up', onlyWithTrend: true })}>Migliori per trend</button>
                  <button type="button" onClick={() => setFilters({ ...filters, sortBy: 'priceAsc', price: 'low' })}>Low cost</button>
                  <button type="button" onClick={() => setFilters({ ...filters, sortBy: 'role', price: 'all', trend: 'all' })}>Equilibrati per ruolo</button>
                </div>
                <div className="market-filters extended-filters">
                  <label>Search nome<input value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} placeholder="Cerca giocatore" /></label>
                  <label>Ruolo<select value={filters.role} onChange={event => setFilters({ ...filters, role: event.target.value as FavcRole | 'all' })}><option value="all">Tutti</option><option value="P">Portieri</option><option value="D">Difensori</option><option value="C">Centrocampisti</option><option value="A">Attaccanti</option></select></label>
                  <label>Squadra<select value={filters.team} onChange={event => setFilters({ ...filters, team: event.target.value })}>{availableTeams.map(team => <option value={team} key={team}>{team}</option>)}</select></label>
                  <label>Prezzo<select value={filters.price} onChange={event => setFilters({ ...filters, price: event.target.value as MarketPriceFilter })}><option value="all">Tutti</option><option value="low">fino a 8</option><option value="mid">9 - 12</option><option value="high">13+</option></select></label>
                  <label>Trend<select value={filters.trend} onChange={event => setFilters({ ...filters, trend: event.target.value as MarketTrendFilter })}><option value="all">Tutti</option><option value="up">rialzo</option><option value="stable">stabile</option><option value="down">ribasso</option></select></label>
                  <label>Ordina<select value={filters.sortBy} onChange={event => setFilters({ ...filters, sortBy: event.target.value as MarketSortKey })}><option value="priceAsc">prezzo crescente</option><option value="priceDesc">prezzo decrescente</option><option value="quoteChange">variazione quota</option><option value="return">rendimento trend</option><option value="name">nome</option><option value="role">ruolo</option></select></label>
                  <label className="checkbox-filter"><input type="checkbox" checked={filters.onlyWithTrend} onChange={event => setFilters({ ...filters, onlyWithTrend: event.target.checked })} /> Solo con trend</label>
                </div>
                <div className="player-card-grid market-card-grid">
                  {filteredPlayers.slice(0, 80).map(player => (
                    <div className="builder-market-card" key={player.id}>
                      <PlayerCard player={playerToCard(player, selected)} compact onAction={() => addPlayer(player)} />
                      <span>Costo totale con fee: <strong>{formatCredits(player.quote * (1 + BUY_COMMISSION_RATE))}</strong></span>
                    </div>
                  ))}
                </div>
                {filteredPlayers.length === 0 && <EmptyState title="Nessun giocatore disponibile" text="Modifica filtri o rimuovi giocatori dalla rosa in costruzione." />}
              </Section>
            </div>

            <aside className="builder-roster-column">
              <Section title="STEP 3 - Riepilogo rosa">
                <div className="builder-summary-card card">
                  <div><span>Stagione</span><strong>{seasonLabel}</strong></div>
                  <div><span>Capitale iniziale</span><strong>{formatCredits(summary.initialCapital)}</strong></div>
                  <div><span>Costo giocatori</span><strong>{formatCredits(summary.playerCost)}</strong></div>
                  <div><span>Commissioni acquisto 2%</span><strong>{formatCredits(summary.buyCommissions)}</strong></div>
                  <div><span>Costo totale</span><strong>{formatCredits(summary.totalCost)}</strong></div>
                  <div><span>Cash residuo</span><strong>{formatCredits(summary.residualCash)}</strong></div>
                  <div><span>Capitale extra richiesto</span><strong>{formatCredits(summary.extraCapitalAdded)}</strong></div>
                  <div><span>Stato</span><strong>{summary.status}</strong></div>
                </div>

                {summary.extraCapitalAdded > 0 && (
                  <div className="trade-warning">Capitale insufficiente: alla conferma serviranno {formatCredits(summary.extraCapitalAdded)} extra virtuali. Richiede conferma chiara.</div>
                )}
                {!summary.isValid && (
                  <div className="trade-warning">Conferma non disponibile: controlla rosa incompleta, ruoli pieni o duplicati.</div>
                )}

                {ROLE_ORDER.map(role => {
                  const rolePlayers = selected.filter(player => player.role === role);
                  return (
                    <div className="card table-scroll builder-role-card" key={role}>
                      <h3>{roleNames[role]} {rolePlayers.length}/{roleLimits[role]}</h3>
                      <table className="compact-table">
                        <tbody>
                          {rolePlayers.map(player => (
                            <tr key={player.id}>
                              <td><strong>{player.playerName}</strong><br /><span>{player.realTeam}</span></td>
                              <td>{formatCredits(player.quote)}</td>
                              <td><button className="favc-action favc-action-sell" type="button" onClick={() => removePlayer(player)}>Rimuovi dalla rosa</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {rolePlayers.length === 0 && <p className="table-note">Nessun giocatore selezionato.</p>}
                    </div>
                  );
                })}

                {message && <div className={message.tone === 'error' ? 'trade-error' : message.tone === 'success' ? 'verdict' : 'trade-warning'}>{message.text}</div>}
                <div className="builder-save-panel">
                  <span>STEP 4 - Salvataggio</span>
                  <strong>{summary.isValid ? 'Rosa pronta per salvataggio' : 'Completa 25 giocatori con composizione 3/8/8/6'}</strong>
                  <p>Il team salvato diventa la squadra attiva della simulazione 2025/26.</p>
                </div>
                <button className="button builder-primary-save" type="button" disabled={!summary.isValid || submitting || !backendConnected || !seasonId} onClick={() => setConfirmOpen(true)}>
                  SALVA ROSA E AVVIA SIMULAZIONE
                </button>
              </Section>
            </aside>
          </div>

          {confirmOpen && (
            <div className="modal-backdrop" role="presentation" onMouseDown={() => !submitting && setConfirmOpen(false)}>
              <section className="trade-confirm-modal builder-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="builder-confirm-title" onMouseDown={event => event.stopPropagation()}>
                <header className="trade-confirm-header">
                  <div>
                    <span className="badge badge-blue">STEP 4 - Salvataggio finale</span>
                    <h2 id="builder-confirm-title">Salva rosa e avvia simulazione</h2>
                  </div>
                  <button type="button" className="drawer-close" onClick={() => !submitting && setConfirmOpen(false)} disabled={submitting}>x</button>
                </header>
                <label className="builder-name-field">
                  <span>Nome della rosa</span>
                  <input
                    type="text"
                    value={rosterName}
                    onChange={event => setRosterName(event.target.value)}
                    placeholder="es. Aggressivo, Difensivo, Mix value..."
                    maxLength={48}
                    autoFocus
                    disabled={submitting}
                  />
                  <small>Scegli un nome riconoscibile: potrai salvare piu rose e confrontarle nella simulazione.</small>
                </label>
                <div className="settlement-formula compact-formula">
                  <div><span>Stagione</span><strong>{seasonLabel}</strong></div>
                  <div><span>Totale quote</span><strong>{formatCredits(summary.playerCost)}</strong></div>
                  <div><span>Commissioni acquisto 2%</span><strong>{formatCredits(summary.buyCommissions)}</strong></div>
                  <div><span>Capitale virtuale iniziale</span><strong>{formatCredits(summary.initialCapital)}</strong></div>
                  <div><span>Capitale extra virtuale</span><strong>{formatCredits(summary.extraCapitalAdded)}</strong></div>
                  <div><span>Cash residuo</span><strong>{formatCredits(summary.residualCash)}</strong></div>
                </div>
                <div className="table-scroll builder-confirm-list">
                  <table className="compact-table">
                    <tbody>
                      {selected.map(player => <tr key={player.id}><td>{player.playerName}</td><td>{player.realTeam}</td><td>{player.role}</td><td>{formatCredits(player.quote)}</td></tr>)}
                    </tbody>
                  </table>
                </div>
                <p className="table-note">Nessun pagamento reale. La rosa viene sempre salvata in locale (multi-rosa supportato); se il backend e' attivo, viene scritta anche li.</p>
                {message && message.tone === 'error' && <div className="trade-error">{message.text}</div>}
                <footer className="trade-confirm-actions">
                  <button type="button" className="button button-ghost" onClick={() => setConfirmOpen(false)} disabled={submitting}>Annulla</button>
                  <button type="button" className="button button-primary" onClick={confirmRoster} disabled={submitting || !rosterName.trim()}>{submitting ? 'Salvataggio...' : 'SALVA ROSA E AVVIA SIMULAZIONE'}</button>
                </footer>
              </section>
            </div>
          )}
        </>
      )}
    </>
  );
}
