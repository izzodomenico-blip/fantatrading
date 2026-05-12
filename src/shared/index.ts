/**
 * FantaTrading Shared Engine — barrel export pubblico.
 *
 * Questa libreria contiene la logica di calcolo canonica di FantaTrading V1:
 * formula quotazioni, commissioni, ROI, bonus/malus, validazione rosa.
 *
 * È usata sia dai backtest TypeScript esistenti sia dal futuro backend NestJS.
 * Non contiene dipendenze da framework (NestJS, Express, Prisma).
 */

// ─── Tipi di dominio ──────────────────────────────────────────────────────────
export * from './domain';

// ─── Costanti regolamento V1 ──────────────────────────────────────────────────
export * from './rules/v1Rules';

// ─── Calcoli puri ─────────────────────────────────────────────────────────────
export * from './calculations/commissions';
export * from './calculations/positionValue';
export * from './calculations/portfolio';
export * from './calculations/roi';
export * from './calculations/roster';
export * from './calculations/teamBand';
export * from './calculations/bonusMalus';

// ─── Precisione monetaria ─────────────────────────────────────────────────────
export * from './money/precision';

// ─── Tipi audit (per futuro backend) ─────────────────────────────────────────
export * from './audit/AuditEvent';
