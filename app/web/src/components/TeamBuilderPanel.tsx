import { useMemo, useState } from 'react';
import { createFantaTradingApi } from '../api';
import PlayerCard, { type PlayerCardData } from './PlayerCard';
import { EmptyState, MetricCard, Section, StatusBadges } from '../components';
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
import { formatCredits } from '../utils/format';

type TeamBuilderPanelProps = {
  players: DemoMarketPlayer[];
  seasonId?: string | null;
  existingTeamId?: string | null;
  backendConnected: boolean;
  onCreated: () => void;
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
  existingTeamId,
  backendConnected,
  onCreated,
  onContinueExisting,
}: TeamBuilderPanelProps) {
  const [capital, setCapital] = useState(300);
  const [buildingStarted, setBuildingStarted] = useState(false);
  const [selected, setSelected] = useState<DemoMarketPlayer[]>([]);
  const [submitting, setSubmitting] = useState(false);
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
    if (!backendConnected || !seasonId) {
      setMessage({ tone: 'error', text: 'Backend demo non collegato o stagione non disponibile: impossibile scrivere la squadra.' });
      return;
    }
    if (!summary.isValid) {
      setMessage({ tone: 'error', text: 'Completa la rosa con composizione 3/8/8/6 prima della conferma.' });
      return;
    }
    if (existingTeamId && !resetExistingDemoTeam) {
      setMessage({ tone: 'error', text: 'Esiste gia un team demo per questa stagione: scegli reset demo oppure continua la squadra esistente.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    const api = createFantaTradingApi();
    const result = await api.createTeamWithRoster({
      seasonId,
      initialVirtualCapital: capital,
      playerIds: selected.map(player => player.id),
      teamName: 'Team costruito da UI',
      resetExistingDemoTeam,
    });
    setSubmitting(false);

    if (!result.ok) {
      setMessage({ tone: 'error', text: result.status ? `${result.error} (${result.status})` : result.error });
      return;
    }

    setMessage({ tone: 'success', text: 'Squadra creata nella demo backend. Portafoglio e operazioni aggiornati.' });
    onCreated();
  }

  return (
    <>
      <Section title="Crea squadra FAVC">
        <StatusBadges items={['Capitale virtuale', 'Nessun denaro reale', 'Commissione acquisto 2%', backendConnected ? 'Demo backend' : 'Fallback mock']} />
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
          <h3>Step 1 - Capitale iniziale</h3>
          <p>Imposta solo capitale virtuale. Non e un pagamento reale e non genera payout reale.</p>
          <div className="capital-picker">
            {PRESETS.map(value => (
              <button key={value} className={capital === value ? 'active' : ''} type="button" onClick={() => setCapital(value)}>{value}</button>
            ))}
            <input type="number" min="0" value={capital} onChange={event => setCapital(Number(event.target.value) || 0)} />
            <button className="button" type="button" onClick={() => setBuildingStarted(true)}>Inizia costruzione rosa</button>
          </div>
        </div>
      </Section>

      {buildingStarted && (
        <>
          <Section title="Step 2 - Mercato giocatori reali">
            <div className="market-filters extended-filters">
              <label>Search nome<input value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} placeholder="Cerca giocatore" /></label>
              <label>Ruolo<select value={filters.role} onChange={event => setFilters({ ...filters, role: event.target.value as FavcRole | 'all' })}><option value="all">Tutti</option><option value="P">Portieri</option><option value="D">Difensori</option><option value="C">Centrocampisti</option><option value="A">Attaccanti</option></select></label>
              <label>Squadra<select value={filters.team} onChange={event => setFilters({ ...filters, team: event.target.value })}>{availableTeams.map(team => <option value={team} key={team}>{team}</option>)}</select></label>
              <label>Prezzo<select value={filters.price} onChange={event => setFilters({ ...filters, price: event.target.value as MarketPriceFilter })}><option value="all">Tutti</option><option value="low">fino a 8</option><option value="mid">9 - 12</option><option value="high">13+</option></select></label>
              <label>Trend<select value={filters.trend} onChange={event => setFilters({ ...filters, trend: event.target.value as MarketTrendFilter })}><option value="all">Tutti</option><option value="up">rialzo</option><option value="stable">stabile</option><option value="down">ribasso</option></select></label>
              <label>Ordina<select value={filters.sortBy} onChange={event => setFilters({ ...filters, sortBy: event.target.value as MarketSortKey })}><option value="role">ruolo</option><option value="price">prezzo</option><option value="return">rendimento stimato</option><option value="name">nome</option><option value="quoteChange">variazione quota</option></select></label>
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

          <Section title="Step 3 - Rosa in costruzione">
            <div className="metric-grid favc-metric-grid">
              <MetricCard label="Capitale iniziale" value={formatCredits(summary.initialCapital)} sub="totalCapitalDeposited iniziale" color="var(--teal)" />
              <MetricCard label="Cash residuo" value={formatCredits(summary.residualCash)} sub="dopo acquisti selezionati" color="var(--green)" />
              <MetricCard label="Capitale extra" value={formatCredits(summary.extraCapitalAdded)} sub="richiede conferma finale" color="var(--amber)" />
              <MetricCard label="Commissioni buy" value={formatCredits(summary.buyCommissions)} sub="2% su ogni acquisto" color="var(--purple)" />
              <MetricCard label="Valore rosa" value={formatCredits(summary.rosterValue)} sub={`${selected.length}/25 giocatori`} color="var(--accent)" />
              <MetricCard label="Stato" value={summary.status} sub={`${summary.counts.P}/3 P, ${summary.counts.D}/8 D, ${summary.counts.C}/8 C, ${summary.counts.A}/6 A`} color={summary.isValid ? 'var(--green)' : 'var(--amber)'} />
            </div>

            {summary.extraCapitalAdded > 0 && (
              <div className="trade-warning">Il cash iniziale non basta: alla conferma verranno aggiunti {formatCredits(summary.extraCapitalAdded)} di capitale virtuale extra. Nessun denaro reale.</div>
            )}

            <div className="favc-dashboard-grid">
              {ROLE_ORDER.map(role => {
                const rolePlayers = selected.filter(player => player.role === role);
                return (
                  <div className="card table-scroll" key={role}>
                    <h3>{roleNames[role]} {rolePlayers.length}/{roleLimits[role]}</h3>
                    <table className="compact-table">
                      <tbody>
                        {rolePlayers.map(player => (
                          <tr key={player.id}>
                            <td><strong>{player.playerName}</strong><br /><span>{player.realTeam}</span></td>
                            <td>{formatCredits(player.quote)}</td>
                            <td><button className="favc-action favc-action-sell" type="button" onClick={() => removePlayer(player)}>Rimuovi</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rolePlayers.length === 0 && <p className="table-note">Nessun giocatore selezionato.</p>}
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Step 4 - Conferma squadra">
            <div className="favc-settlement-grid">
              <div className="card">
                <div className="settlement-formula">
                  <div><span>Capitale virtuale iniziale</span><strong>{formatCredits(summary.initialCapital)}</strong></div>
                  <div><span>Capitale extra</span><strong>{formatCredits(summary.extraCapitalAdded)}</strong></div>
                  <div><span>Costo giocatori</span><strong>{formatCredits(summary.playerCost)}</strong></div>
                  <div><span>Commissioni 2%</span><strong>{formatCredits(summary.buyCommissions)}</strong></div>
                  <div><span>Cash residuo</span><strong>{formatCredits(summary.residualCash)}</strong></div>
                </div>
                <p className="table-note">La conferma scrive sul backend una rosa completa 3/8/8/6. Il ROI resta la metrica di ranking, senza payout reale.</p>
                {message && <div className={message.tone === 'error' ? 'trade-error' : message.tone === 'success' ? 'verdict' : 'trade-warning'}>{message.text}</div>}
                <button className="button" type="button" disabled={!summary.isValid || submitting || !backendConnected || !seasonId} onClick={confirmRoster}>
                  {submitting ? 'Creazione...' : existingTeamId ? 'Conferma e ricostruisci demo' : 'Conferma squadra'}
                </button>
              </div>
              <div className="notice-card settlement-notice">
                <span className="badge badge-amber">Nessun denaro reale</span>
                <strong>Conferma controllata</strong>
                <p>Prima della conferma la rosa e solo locale. Il database viene modificato solo dal click finale.</p>
              </div>
            </div>
          </Section>
        </>
      )}
    </>
  );
}
