import { DEV_CORS_ORIGINS, parseCorsOrigins } from './app.config';

describe('app config CORS origins', () => {
  it('uses localhost and 127.0.0.1 defaults in development', () => {
    expect(parseCorsOrigins(undefined, 'development')).toEqual(DEV_CORS_ORIGINS);
  });

  it('keeps production restrictive without explicit origins', () => {
    expect(parseCorsOrigins(undefined, 'production')).toEqual([]);
  });

  it('parses explicit comma-separated origins', () => {
    expect(parseCorsOrigins('http://localhost:5173, http://127.0.0.1:5173', 'production')).toEqual([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ]);
  });
});
