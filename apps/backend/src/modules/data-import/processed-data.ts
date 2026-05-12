import { BadRequestException } from '@nestjs/common';
import { PlayerRole } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export type ProcessedQuoteRow = {
  season: string;
  playerId: number | string;
  role: string;
  playerName: string;
  club: string;
  initialQuote: number;
  currentOrFinalQuote: number;
};

export type ProcessedVoteRow = {
  season: string;
  round: number;
  playerId: number | string;
  playerName: string;
  club: string;
  role: string;
  vote: number | null;
  fantasyVote: number | null;
  played: boolean;
};

export type ProcessedDataFile<T> = {
  totalRows?: number;
  rows: T[];
};

export const DEFAULT_QUOTES_PATH = 'data/real/processed/fantacalcio_quotes_history.json';
export const DEFAULT_VOTES_PATH = 'data/real/processed/votes/fantacalcio_votes_history.json';

const roleMap: Record<string, PlayerRole> = {
  P: PlayerRole.GK,
  POR: PlayerRole.GK,
  GK: PlayerRole.GK,
  D: PlayerRole.DEF,
  DEF: PlayerRole.DEF,
  C: PlayerRole.MID,
  MID: PlayerRole.MID,
  A: PlayerRole.FWD,
  FWD: PlayerRole.FWD,
};

export function mapProcessedRole(role: string): PlayerRole | null {
  return roleMap[role.trim().toUpperCase()] ?? null;
}

export function splitPlayerName(playerName: string) {
  const normalized = playerName.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return { firstName: 'Unknown', lastName: 'Unknown' };
  }

  const parts = normalized.split(' ');
  if (parts.length === 1) {
    return { firstName: '', lastName: parts[0] };
  }

  return {
    firstName: parts.slice(1).join(' '),
    lastName: parts[0],
  };
}

export function loadProcessedJson<T>(relativePath: string): ProcessedDataFile<T> {
  const fromRepoRoot = resolve(process.cwd(), relativePath);
  const fromBackend = resolve(process.cwd(), '..', '..', relativePath);
  const fullPath = existsSync(fromRepoRoot) ? fromRepoRoot : fromBackend;
  try {
    const raw = readFileSync(fullPath, 'utf8');
    const parsed = JSON.parse(raw) as ProcessedDataFile<T>;
    if (!Array.isArray(parsed.rows)) {
      throw new BadRequestException('Processed JSON must contain a rows array');
    }
    return parsed;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException(`Cannot read processed JSON file: ${relativePath}`);
  }
}
