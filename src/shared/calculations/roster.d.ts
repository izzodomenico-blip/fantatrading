import type { RosterCount } from '../domain';
export type { RosterCount };
export declare function validateRosterComposition(actual: RosterCount, required?: RosterCount): string[];
export declare function isRosterComplete(actual: RosterCount, required?: RosterCount): boolean;
