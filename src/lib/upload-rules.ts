// قواعد الملفات المقبولة (تُستخدم في المتصفح للتحقق قبل الرفع، وفي الخادم للتحقق النهائي)
export const UPLOAD_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'png', 'jpg', 'jpeg', 'webp', 'pptx'];
export const UPLOAD_ACCEPT_ATTR = UPLOAD_EXTS.map(e => `.${e}`).join(',');
export const UPLOAD_HINT = 'PDF أو Word أو Excel أو صور';

/** التحقق من الامتداد والحجم؛ يُرجع رسالة خطأ بالعربية أو null إن كان الملف مقبولاً */
export function checkFile(file: { name: string; size: number }, maxMb: number): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!UPLOAD_EXTS.includes(ext)) return `نوع الملف غير مدعوم (.${ext || '؟'}) — المقبول: ${UPLOAD_HINT}`;
  if (!file.size) return 'الملف فارغ';
  if (file.size > maxMb * 1048576) return `حجم الملف أكبر من ${maxMb} م.ب`;
  return null;
}
