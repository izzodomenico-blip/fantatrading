import { V1_ROSTER_COMPOSITION } from '../rules/v1Rules';
import type { RosterCount } from '../domain';

export type { RosterCount };

/**
 * Valida la composizione della rosa rispetto alla composizione richiesta.
 * V1: 3 GK + 8 DEF + 8 MID + 6 FWD = 25 giocatori.
 *
 * @returns Array di messaggi di errore. Array vuoto se la rosa è valida.
 */
export function validateRosterComposition(
  actual: RosterCount,
  required: RosterCount = V1_ROSTER_COMPOSITION,
): string[] {
  const errors: string[] = [];
  const roles: (keyof RosterCount)[] = ['GK', 'DEF', 'MID', 'FWD'];
  for (const role of roles) {
    if (actual[role] !== required[role]) {
      errors.push(`${role}: richiesti ${required[role]}, trovati ${actual[role]}`);
    }
  }
  return errors;
}

/**
 * Restituisce true se la rosa rispetta esattamente la composizione V1.
 */
export function isRosterComplete(
  actual: RosterCount,
  required: RosterCount = V1_ROSTER_COMPOSITION,
): boolean {
  return validateRosterComposition(actual, required).length === 0;
}
