// ثوابت بيانات الجهات (آمنة للاستخدام في المتصفح والخادم)
export const ORG_TYPES = ['جمعية أهلية', 'مؤسسة أهلية', 'وقف', 'جمعية تعاونية', 'لجنة أهلية', 'جهة غير ربحية أخرى'];
export const LICENSE_ISSUERS = ['المركز الوطني لتنمية القطاع غير الربحي', 'وزارة الموارد البشرية والتنمية الاجتماعية', 'الهيئة العامة للأوقاف', 'جهة إشرافية أخرى'];

export const ORG_DOC_META: Record<string, { label: string; hint: string; required: boolean }> = {
  LICENSE: { label: 'صورة ترخيص الجهة', hint: 'الترخيص أو شهادة التسجيل سارية المفعول', required: true },
  BYLAWS: { label: 'النظام الأساسي للجهة', hint: 'اللائحة الأساسية المعتمدة', required: true },
  AUTH_LETTER: { label: 'خطاب تفويض الممثل', hint: 'يفوّض مقدّم الطلب بالتعامل مع المنصة باسم الجهة', required: true },
  BOARD: { label: 'تشكيل مجلس الإدارة الحالي', hint: 'اختياري: يعزز التوثيق', required: false },
  TAX_CERT: { label: 'شهادة التسجيل الضريبي', hint: 'اختياري: تظهر بيانات الجهة في الفاتورة', required: false },
  OTHER: { label: 'مستند آخر', hint: 'أي مستند داعم', required: false },
};

export const VERIFICATION_LABEL: Record<string, { label: string; tone: string; hint: string }> = {
  UNVERIFIED: { label: 'غير موثقة', tone: 'slate', hint: 'أكمل البيانات والمستندات ليبدأ توثيق جهتك' },
  PENDING: { label: 'قيد التوثيق', tone: 'amber', hint: 'تراجع الإدارة بيانات جهتك ومستنداتها' },
  VERIFIED: { label: 'موثقة', tone: 'green', hint: 'جهتك موثقة وتستطيع طلب زيارة التحقق' },
  REJECTED: { label: 'يلزم تصحيح', tone: 'orange', hint: 'راجع ملاحظات الإدارة وصحّح المستندات أو البيانات' },
};
