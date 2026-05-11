import { SimulationPreset, SIMULATION_PRESETS } from '../config/simulationPresets';
import { runMonteCarloSimulation, MonteCarloResult } from './monteCarloSimulator';

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  preset: SimulationPreset;
}

export interface ScenarioResult {
  scenario: ScenarioDefinition;
  result: MonteCarloResult;
  executionTimeMs: number;
}

export function runScenario(scenario: ScenarioDefinition): ScenarioResult {
  const start = Date.now();
  const result = runMonteCarloSimulation(scenario.preset);
  return {
    scenario,
    result,
    executionTimeMs: Date.now() - start,
  };
}

export function runAllScenarios(scenarios: ScenarioDefinition[]): ScenarioResult[] {
  return scenarios.map(runScenario);
}

export function buildDefaultScenarios(): ScenarioDefinition[] {
  return Object.entries(SIMULATION_PRESETS).map(([id, preset]) => ({
    id,
    name: preset.name,
    description: preset.description,
    preset,
  }));
}

export function compareScenarios(results: ScenarioResult[]): {
  scenarioId: string;
  name: string;
  avgPrizePool: number;
  avgPlatformRevenue: number;
  prizePoolStdDev: number;
  avgWinnerPrize: number;
}[] {
  return results.map(sr => ({
    scenarioId: sr.scenario.id,
    name: sr.scenario.name,
    avgPrizePool: sr.result.summary.avgPrizePool,
    avgPlatformRevenue: sr.result.summary.avgPlatformRevenue,
    prizePoolStdDev: sr.result.summary.prizePoolStdDev,
    avgWinnerPrize: sr.result.summary.avgWinnerPrize,
  }));
}
