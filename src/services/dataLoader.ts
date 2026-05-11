import * as fs from 'fs';
import * as path from 'path';
import { PlayerRole } from '../domain/Player';

export interface MockPlayer {
  id: string;
  name: string;
  role: PlayerRole;
  club: string;
  baseValue: number;
}

export interface LeagueConfig {
  id: string;
  label: string;
  numParticipants: number;
  numSimulations: number;
  operationsPerTeamPerRound: number;
  registrationFeePerTeam: number;
  notes: string;
}

const DATA_DIR = path.join(__dirname, '../../data/examples');

export function loadPlayers(filePath?: string): MockPlayer[] {
  const fp = filePath ?? path.join(DATA_DIR, 'players.json');
  const raw = fs.readFileSync(fp, 'utf-8');
  const parsed = JSON.parse(raw) as MockPlayer[];

  parsed.forEach(p => {
    if (!['GK', 'DEF', 'MID', 'FWD'].includes(p.role))
      throw new Error(`Ruolo non valido per ${p.name}: ${p.role}`);
    if (p.baseValue <= 0)
      throw new Error(`baseValue non valido per ${p.name}: ${p.baseValue}`);
  });

  return parsed;
}

export function loadLeagueConfigs(filePath?: string): Record<string, LeagueConfig> {
  const fp = filePath ?? path.join(DATA_DIR, 'league_configs.json');
  const raw = fs.readFileSync(fp, 'utf-8');
  return JSON.parse(raw) as Record<string, LeagueConfig>;
}

export function getPlayersByRole(players: MockPlayer[], role: PlayerRole): MockPlayer[] {
  return players.filter(p => p.role === role);
}

export function getAverageBaseValue(players: MockPlayer[]): number {
  if (players.length === 0) return 0;
  return players.reduce((s, p) => s + p.baseValue, 0) / players.length;
}
