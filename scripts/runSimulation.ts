import { SIMULATION_PRESETS } from '../src/config/simulationPresets';
import { runMonteCarloSimulation } from '../src/simulation/monteCarloSimulator';

const presetKey = process.argv[2] ?? 'small';
const preset = SIMULATION_PRESETS[presetKey];

if (!preset) {
  console.error(`Preset "${presetKey}" non trovato. Disponibili: ${Object.keys(SIMULATION_PRESETS).join(', ')}`);
  process.exit(1);
}

console.log(`\n=== FantaTrading Monte Carlo Simulation ===`);
console.log(`Preset: ${preset.name}`);
console.log(`Squadre: ${preset.numTeams} | Operazioni/giornata: ${preset.operationsPerTeamPerRound} | Simulazioni: ${preset.numSimulations}\n`);

const start = Date.now();
const result = runMonteCarloSimulation(preset);
const elapsed = Date.now() - start;

const s = result.summary;
console.log(`Risultati (${result.runs.length} simulazioni in ${elapsed}ms):`);
console.log(`  Montepremi medio:      ${s.avgPrizePool.toFixed(2)} crediti`);
console.log(`  Montepremi min:        ${s.minPrizePool.toFixed(2)} crediti`);
console.log(`  Montepremi max:        ${s.maxPrizePool.toFixed(2)} crediti`);
console.log(`  Dev. standard pool:    ${s.prizePoolStdDev.toFixed(2)} crediti`);
console.log(`  Ricavo piattaforma:    ${s.avgPlatformRevenue.toFixed(2)} crediti`);
console.log(`  Premio vincitore:      ${s.avgWinnerPrize.toFixed(2)} crediti`);
