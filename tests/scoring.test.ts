import { describe, it, expect } from 'vitest';
import { evaluate } from '../src/lib/scoring';
import cases from './scoring-cases.json';

describe('محرك الحساب يطابق النموذج المعتمد', () => {
  for (const c of cases as any[]) {
    it(c.name, () => {
      const r = evaluate(c.L, c.expenses);
      expect(r.total).toBe(c.total);
      expect(r.level).toBe(c.level);
      expect(r.baseLevel).toBe(c.base);
      expect(r.status).toBe(c.status);
      expect(r.dmi).toBe(c.dmi);
      expect(r.a3adj).toBeCloseTo(c.a3adj, 3);
      expect(r.Fd).toBeCloseTo(c.Fd, 6);
      expect(r.Fs).toBeCloseTo(c.Fs, 6);
      expect(r.gateFail.map(g => g[0]).sort()).toEqual([...c.gate_fail].sort());
      expect(r.trkFail.map(g => g[0]).sort()).toEqual([...c.trk_fail].sort());
      expect(r.evidenceIdx).toBe(c.evid);
      for (const k of ['1', '2', '3', '4']) expect(r.axes[k]).toBeCloseTo(c.axes[k], 3);
    });
  }
});
