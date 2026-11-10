// صلاحيات مديري الحسابات — يحددها الأدمن لكل مدير
export const PERMISSIONS = [
  { code: 'orgs.view', label: 'عرض الجهات', group: 'الجهات' },
  { code: 'orgs.manage', label: 'تعديل بيانات الجهات وإسناد مدير الحساب', group: 'الجهات' },
  { code: 'orgs.verify', label: 'توثيق الجهات ومراجعة مستنداتها', group: 'الجهات' },
  { code: 'assessments.view', label: 'عرض طلبات التقييم', group: 'التقييمات' },
  { code: 'assessments.assign', label: 'إسناد المقيّمين', group: 'التقييمات' },
  { code: 'assessments.manage', label: 'إدارة حالة التقييم واعتماد النتائج', group: 'التقييمات' },
  { code: 'visits.manage', label: 'جدولة زيارات التحقق وإسناد المستشارين', group: 'التقييمات' },
  { code: 'certificates.issue', label: 'إصدار الشهادات', group: 'الشهادات' },
  { code: 'certificates.revoke', label: 'إلغاء الشهادات', group: 'الشهادات' },
  { code: 'payments.view', label: 'عرض المدفوعات والفواتير', group: 'المالية' },
  { code: 'payments.approve', label: 'اعتماد التحويلات البنكية', group: 'المالية' },
  { code: 'payments.refund', label: 'تسجيل الاسترداد', group: 'المالية' },
  { code: 'coupons.manage', label: 'إدارة أكواد الخصم', group: 'المالية' },
  { code: 'users.manage', label: 'إدارة المقيّمين', group: 'الفريق' },
  { code: 'settings.pricing', label: 'تعديل الأسعار والضريبة', group: 'الإعدادات' },
  { code: 'settings.gateways', label: 'إعداد بوابات الدفع ومفاتيحها', group: 'الإعدادات' },
  { code: 'settings.ai', label: 'إعدادات الفحص الأولي للمستندات', group: 'الإعدادات' },
  { code: 'settings.social', label: 'إعدادات الدخول عبر Google وFacebook وLinkedIn', group: 'الإعدادات' },
  { code: 'settings.requirements', label: 'متطلبات الملفات', group: 'الإعدادات' },
  { code: 'reports.view', label: 'التقارير والإحصاءات', group: 'التقارير' },
  { code: 'audit.view', label: 'سجل النشاط', group: 'التقارير' },
] as const;
export type Permission = (typeof PERMISSIONS)[number]['code'];
export const ALL_PERMISSIONS = PERMISSIONS.map(p => p.code) as Permission[];
