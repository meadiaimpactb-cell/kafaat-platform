export const fmtNum = (n: number | null | undefined, d = 0) => (n == null || isNaN(Number(n)) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
export const fmtSAR = (n: number | null | undefined) => (n == null ? '—' : `${fmtNum(n, Number(n) % 1 ? 2 : 0)} ر.س`);
export const fmtDate = (d: Date | string | null | undefined, withTime = false) => {
  if (!d) return '—';
  const x = typeof d === 'string' ? new Date(d) : d;
  return x.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { year: 'numeric', month: 'long', day: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) });
};
export const fmtRel = (d: Date | string | null | undefined) => {
  if (!d) return '—';
  const x = typeof d === 'string' ? new Date(d) : d;
  const s = (Date.now() - x.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
  if (s < 60) return 'الآن';
  if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
  if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
  if (s < 86400 * 30) return rtf.format(-Math.round(s / 86400), 'day');
  return fmtDate(x);
};
export const fileSize = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} ك.ب` : `${(b / 1048576).toFixed(1)} م.ب`);
