import * as fs from 'fs';
import * as path from 'path';

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeJSON(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function writeCSV(filePath: string, headers: string[], rows: (string | number | boolean)[][]): void {
  ensureDir(path.dirname(filePath));
  const escape = (v: string | number | boolean) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))];
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}
