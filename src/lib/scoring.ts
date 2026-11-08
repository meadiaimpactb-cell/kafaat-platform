// محرك حساب درجة كفاءة الأثر — مطابق للمنهج المعتمد (دليل المقيّم، الجزء الرابع من الدليل المرجعي)
import DATA from './scoring-data.json';

export type Levels = Record<string, number>;
export type TrackCode = 'EMERGING' | 'MEDIUM' | 'LARGE';
export const TRACK_AR: Record<TrackCode, string> = { EMERGING: 'ناشئ', MEDIUM: 'متوسط', LARGE: 'كبير' };

const S: Record<string, number> = DATA.S;
export const FACTOR_IDS = Object.keys(S);
export const FACTOR_NAMES: Record<string, string> = DATA.names;
export const AXES: Record<string, { name: string; short: string; pts: number; ids: string[] }> = DATA.AXES;
export const DX: string[] = DATA.DX;
export const SCORED = Object.values(AXES).flatMap(a => a.ids);
export const GATES: Record<string, number> = { F127: 2, F016: 2, F056: 1 }; // بوابات مانعة
export const READY_CAP: Record<string, number> = { F048: 1, F055: 1 }; // شروط جاهزية تُسقف المستوى
export const TRACK_REQ: Record<string, Record<TrackCode, number>> = {
  F056: { EMERGING: 1, MEDIUM: 2, LARGE: 3 },
  F021: { EMERGING: 1, MEDIUM: 2, LARGE: 2 },
  F129: { EMERGING: 1, MEDIUM: 2, LARGE: 3 },
  F004: { EMERGING: 0, MEDIUM: 0, LARGE: 2 },
};
export const CERT_LEVELS: [number, string][] = [[85, 'رائد'], [70, 'متقدم'], [55, 'متمكن'], [40, 'نامٍ'], [0, 'ناشئ']];
export const LEVEL_ORDER = ['ناشئ', 'نامٍ', 'متمكن', 'متقدم', 'رائد'];
export const FACTOR_LEVEL_NAMES = ['غير مثبت', 'أولي', 'نامٍ', 'متقدم', 'رائد'];

export function trackOf(expenses: number): TrackCode {
  if (expenses < 3e6) return 'EMERGING';
  if (expenses < 30e6) return 'MEDIUM';
  return 'LARGE';
}
export function weight(fid: string): number {
  const a = Object.values(AXES).find(x => x.ids.includes(fid));
  if (!a) return 0;
  const tot = a.ids.reduce((s, i) => s + S[i], 0);
  return (S[fid] / tot) * a.pts;
}
export const certLevel = (score: number) => CERT_LEVELS.find(([th]) => score >= th)![1];
const r1 = (x: number) => Math.round(x * 10 + 1e-9) / 10;

export interface CapNote { factor: string; from: number; to: number; why: string }
export interface ScoreResult {
  levels: Levels; raw: Levels; capNotes: CapNote[];
  rows: { id: string; axis: number; level: number; raw: number; w: number; pts: number }[];
  axes: Record<string, number>; Fd: number; Fs: number; Fh: number; a3adj: number;
  total: number; track: TrackCode; gateFail: [string, number, number][]; readyCap: [string, number, number][]; trkFail: [string, number, number][];
  baseLevel: string; level: string; caps: [string, string, string][]; status: 'مؤهل' | 'قيد التأهيل';
  dmi: number; evidenceIdx: number; gaps: { id: string; level: number; priority: number }[];
  blocks: { efficiency: number; evidence: number; drivers: number; eligibility: string };
}

function applyLevelCaps(L: Levels): [Levels, CapNote[]] {
  const L2 = { ...L }; const notes: CapNote[] = [];
  if (L2.F002 <= 1 && L2.F005 > 2) { notes.push({ factor: 'F005', from: L2.F005, to: 2, why: 'تُقرأ كلفة المستفيد مع نسبة التحويل: مستوى F002 لا يتجاوز 1، فسقف F005 هو 2' }); L2.F005 = 2; }
  if (L2.F003 < 2) for (const i of ['F001', 'F005']) if (L2[i] > 3) { notes.push({ factor: i, from: L2[i], to: 3, why: 'لا يتوفر مرجع موثوق (F003 أقل من 2)، فلا يُمنح المستوى 4' }); L2[i] = 3; }
  return [L2, notes];
}

/** يحسب الدرجة وكل مكوناتها. العوامل غير المقدّرة تُعامل بالمستوى 0 (ما لا يُثبت لا يُحتسب). */
export function evaluate(input: Partial<Levels>, expenses: number): ScoreResult {
  const L: Levels = {};
  for (const id of FACTOR_IDS) L[id] = Math.max(0, Math.min(4, Math.round(Number(input[id] ?? 0))));
  const [La, capNotes] = applyLevelCaps(L);
  const rows: ScoreResult['rows'] = []; const ax: Record<string, number> = {};
  for (const [k, a] of Object.entries(AXES)) {
    let s = 0;
    for (const i of a.ids) { const w = weight(i); const p = (La[i] / 4) * w; s += p; rows.push({ id: i, axis: Number(k), level: La[i], raw: L[i], w, pts: p }); }
    ax[k] = s;
  }
  const Fd = 0.7 + (0.3 * (La.F049 + La.F057)) / 8;
  const Fs = La.F106 === 0 ? 0.9 : La.F106 === 1 ? 0.95 : 1.0;
  const Fh = 1 + 0.05 * (La.F121 - 2) + 0.05 * (La.F012 - 2);
  const a3adj = ax['3'] * Fd * Fs;
  const track = trackOf(expenses);
  const gateFail = Object.entries(GATES).filter(([i, m]) => La[i] < m).map(([i, m]) => [i, La[i], m] as [string, number, number]);
  const readyCap = Object.entries(READY_CAP).filter(([i, m]) => La[i] < m).map(([i, m]) => [i, La[i], m] as [string, number, number]);
  const trkFail = Object.keys(TRACK_REQ).filter(i => La[i] < TRACK_REQ[i][track]).map(i => [i, La[i], TRACK_REQ[i][track]] as [string, number, number]);
  const total = r1(ax['1'] + ax['2'] + a3adj + ax['4']);
  const baseLevel = certLevel(total); let level = baseLevel; const caps: [string, string, string][] = [];
  const capTo = (nm: string, why: string) => { if (LEVEL_ORDER.indexOf(level) > LEVEL_ORDER.indexOf(nm)) { caps.push([level, nm, why]); level = nm; } };
  if (a3adj < 6) capTo('نامٍ', 'محور الأثر بعد المعاملات أقل من 6 من 30');
  else if (a3adj < 12) capTo('متمكن', 'محور الأثر بعد المعاملات أقل من 12 من 30');
  if (readyCap.length) capTo('نامٍ', 'شرط جاهزية غير مستوفى: ' + readyCap.map(r => r[0]).join('، '));
  if (trkFail.length) {
    const drop = trkFail.length === 1 ? 1 : 2;
    capTo(LEVEL_ORDER[Math.max(0, LEVEL_ORDER.indexOf(level) - drop)], `متطلبات المسار ${TRACK_AR[track]} غير مستوفاة: ` + trkFail.map(r => r[0]).join('، '));
  }
  const status = gateFail.length ? 'قيد التأهيل' : 'مؤهل';
  const num = DX.reduce((s, i) => s + La[i] * S[i], 0), den = DX.reduce((s, i) => s + 4 * S[i], 0);
  const dmi = r1((num / den) * 100);
  const gaps = DX.filter(i => La[i] < 4).map(i => ({ id: i, level: La[i], priority: ((4 - La[i]) * S[i]) / 100 }))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id)).slice(0, 12);
  const evidenceIdx = r1((ax['2'] / 30) * 100);
  return {
    levels: La, raw: L, capNotes, rows, axes: ax, Fd, Fs, Fh, a3adj, total, track, gateFail, readyCap, trkFail, baseLevel, level, caps, status, dmi, evidenceIdx, gaps,
    blocks: { efficiency: r1(ax['1'] + a3adj), evidence: r1(ax['2']), drivers: dmi, eligibility: gateFail.length ? 'غير مستوفاة' : trkFail.length ? 'مستوفاة جزئياً' : 'مستوفاة' },
  };
}

/** ملخص قابل للحفظ في قاعدة البيانات */
export function snapshot(r: ScoreResult) {
  return {
    total: r.total, level: r.level, baseLevel: r.baseLevel, status: r.status, track: r.track, axes: r.axes, Fd: r.Fd, Fs: r.Fs, Fh: r.Fh, a3adj: r.a3adj,
    dmi: r.dmi, evidenceIdx: r.evidenceIdx, gateFail: r.gateFail, readyCap: r.readyCap, trkFail: r.trkFail, caps: r.caps, capNotes: r.capNotes, gaps: r.gaps, blocks: r.blocks, levels: r.levels,
  };
}
export type ScoreSnapshot = ReturnType<typeof snapshot>;
