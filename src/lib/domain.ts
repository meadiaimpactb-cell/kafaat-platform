// تسميات وألوان مشتركة بين الخادم والواجهة
import type { AssessmentStatus, Track } from '@/db/schema';

export const STATUS: Record<AssessmentStatus, { label: string; tone: string; step: number; hint: string }> = {
  DRAFT: { label: 'مسودة', tone: 'slate', step: 1, hint: 'أكمل بيانات الطلب' },
  AWAITING_PAYMENT: { label: 'بانتظار الدفع', tone: 'amber', step: 2, hint: 'ادفع رسوم التقييم لبدء التعبئة' },
  DATA_COLLECTION: { label: 'تعبئة البيانات', tone: 'sky', step: 3, hint: 'أجب عن الأسئلة وارفع الملفات المطلوبة' },
  SUBMITTED: { label: 'أُرسل للمراجعة', tone: 'violet', step: 4, hint: 'بانتظار إسناد المقيّم' },
  UNDER_REVIEW: { label: 'لدى المقيّم', tone: 'violet', step: 4, hint: 'المقيّم يراجع الأدلة' },
  INFO_REQUESTED: { label: 'مطلوب استيضاح', tone: 'orange', step: 4, hint: 'أجب عن أسئلة المقيّم' },
  DESK_COMPLETED: { label: 'نتيجة غير موثقة', tone: 'lime', step: 5, hint: 'اطّلع على النتيجة واطلب زيارة التحقق للشهادة الموثقة' },
  VERIFICATION: { label: 'زيارة التحقق', tone: 'teal', step: 6, hint: 'زيارة المستشار الميدانية' },
  CERTIFIED: { label: 'شهادة موثقة', tone: 'green', step: 7, hint: 'صدرت الشهادة الموثقة' },
  CANCELLED: { label: 'ملغى', tone: 'rose', step: 0, hint: '' },
};

export const JOURNEY = [
  { n: 1, t: 'حساب الجهة', d: 'البيانات الرئيسة للجهة' },
  { n: 2, t: 'الطلب والدفع', d: 'رسوم التقييم والشهادة' },
  { n: 3, t: 'البيانات والأدلة', d: 'الأسئلة ورفع الملفات' },
  { n: 4, t: 'مراجعة المقيّم', d: 'تقدير العوامل الـ56' },
  { n: 5, t: 'النتيجة غير الموثقة', d: 'الدرجة والفجوات والتوصيات' },
  { n: 6, t: 'زيارة التحقق', d: 'زيارة المستشار الميدانية' },
  { n: 7, t: 'الشهادة الموثقة', d: 'سارية حتى نهاية العام' },
];

export const TRACK_LABEL: Record<Track, string> = { EMERGING: 'ناشئ', MEDIUM: 'متوسط', LARGE: 'كبير' };
export const TRACK_RANGE: Record<Track, string> = { EMERGING: 'أقل من 3 ملايين ريال', MEDIUM: 'من 3 إلى 30 مليون ريال', LARGE: 'أكثر من 30 مليون ريال' };

export const SECTIONS: { key: string; title: string; icon: string; desc: string }[] = [
  { key: 'impact', title: 'الأثر والنتائج', icon: 'Target', desc: 'ما الذي تغيّر فعلاً للمستفيدين، وكيف تعرّفون النتيجة وتحسبون كلفتها' },
  { key: 'resources', title: 'الموارد والكلفة', icon: 'Wallet', desc: 'الكلفة الكاملة للبرامج، وكلفة المستفيد، والمقارنة بالمرجع' },
  { key: 'measurement', title: 'القياس والأدلة', icon: 'LineChart', desc: 'خط الأساس، والمؤشرات، والمتابعة، وجودة البيانات وتصميم التقييم' },
  { key: 'accountability', title: 'المساءلة والحوافز', icon: 'Scale', desc: 'كيف تُتخذ قرارات البرامج بناءً على الأثر، وسلامة الحوافز' },
  { key: 'drivers', title: 'محركات الأثر', icon: 'Cog', desc: 'الاستهداف، والتصميم، والتنفيذ، والقدرات التي تصنع الأثر' },
];

export const GROUP_COLOR: Record<string, string> = {
  'المحور 1': '#0B5233', 'المحور 2': '#0B5233', 'المحور 3': '#0B5233', 'المحور 4': '#0B5233',
  'مكوّن': '#2F6E8F', 'معايرة': '#8E5BA8', 'معامل': '#B88A00', 'بوابة': '#E85A0A', 'متطلب مسار': '#B5470B', 'تشخيصي': '#4A5A50',
};

export const LEVEL_SCALE = [
  { v: 0, name: 'غير مثبت', color: '#E9EDE6', text: '#1E2A23' },
  { v: 1, name: 'أولي', color: '#DCEFD2', text: '#1E2A23' },
  { v: 2, name: 'نامٍ', color: '#B9DCA8', text: '#1E2A23' },
  { v: 3, name: 'متقدم', color: '#5FA24A', text: '#FFFFFF' },
  { v: 4, name: 'رائد', color: '#0B5233', text: '#FFFFFF' },
];

// مستويات الشهادة بأسلوب «بطاقة الكفاءة»
export const CERT_SCALE = [
  { key: 'رائد', min: 85, color: '#0B5233', letter: 'A+' },
  { key: 'متقدم', min: 70, color: '#2F7A3A', letter: 'A' },
  { key: 'متمكن', min: 55, color: '#7DB33A', letter: 'B' },
  { key: 'نامٍ', min: 40, color: '#E8B004', letter: 'C' },
  { key: 'ناشئ', min: 0, color: '#E85A0A', letter: 'D' },
];

export const PRODUCT_LABEL = { CERTIFICATE: 'رسوم التقييم وشهادة كفاءة الأثر', VERIFICATION_VISIT: 'زيارة التحقق للشهادة الموثقة' } as const;
export const PAYMENT_STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  PENDING: { label: 'بانتظار الدفع', tone: 'amber' }, AWAITING_APPROVAL: { label: 'بانتظار اعتماد التحويل', tone: 'violet' }, PAID: { label: 'مدفوع', tone: 'green' },
  FAILED: { label: 'فشل', tone: 'rose' }, CANCELLED: { label: 'ملغى', tone: 'slate' }, REFUNDED: { label: 'مسترد', tone: 'slate' },
};
export const VISIT_STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  REQUESTED: { label: 'مطلوبة', tone: 'amber' }, AWAITING_PAYMENT: { label: 'بانتظار الدفع', tone: 'amber' }, PAID: { label: 'مدفوعة: بانتظار الجدولة', tone: 'violet' },
  SCHEDULED: { label: 'مجدولة', tone: 'sky' }, COMPLETED: { label: 'منجزة', tone: 'green' }, CANCELLED: { label: 'ملغاة', tone: 'slate' },
};
export const ROLE_LABEL = { SUPER_ADMIN: 'الأدمن', ACCOUNT_MANAGER: 'مدير حساب', ASSESSOR: 'مقيّم', ORG_USER: 'جهة' } as const;

export const REGIONS = ['الرياض', 'مكة المكرمة', 'المدينة المنورة', 'القصيم', 'المنطقة الشرقية', 'عسير', 'تبوك', 'حائل', 'الحدود الشمالية', 'جازان', 'نجران', 'الباحة', 'الجوف'];
export const FIELDS = ['التنمية الأسرية', 'الصحة', 'التعليم', 'الإسكان', 'الأمن الغذائي', 'التمكين الاقتصادي والتوظيف', 'رعاية الأيتام', 'الإعاقة', 'كبار السن', 'الشباب', 'البيئة', 'الثقافة', 'الإغاثة', 'البر العام', 'أخرى'];

export const ACTION_LABEL: Record<string, string> = {
  'assessment.created': 'أُنشئ طلب التقييم', 'payment.paid': 'اكتمل الدفع', 'payment.approved': 'اعتُمد التحويل البنكي', 'payment.rejected': 'رُفض إيصال التحويل', 'payment.refunded': 'سُجل استرداد',
  'document.uploaded': 'رُفع ملف', 'assessment.submitted': 'أُرسل الطلب للمراجعة', 'assessment.resubmitted': 'أُعيد الإرسال بعد الاستيضاح', 'assessment.assigned': 'أُسند المقيّم', 'assessment.status': 'تغيّرت حالة الطلب',
  'review.started': 'بدأ المقيّم المراجعة', 'review.ai_accepted': 'اعتُمدت مقترحات المساعد', 'info.requested': 'طلب المقيّم استيضاحاً', 'desk.completed': 'صدرت النتيجة غير الموثقة',
  'visit.requested': 'طُلبت زيارة التحقق', 'visit.scheduled': 'جُدولت زيارة التحقق', 'visit.completed': 'اكتملت زيارة التحقق', 'certificate.verified': 'صدرت الشهادة الموثقة', 'certificate.revoked': 'أُلغيت شهادة',
  'user.created': 'أُنشئ مستخدم', 'user.updated': 'عُدّل مستخدم', 'settings.gateway': 'عُدّلت بوابة دفع', 'settings.ai': 'عُدّلت إعدادات Claude', 'auth.login': 'تسجيل دخول',
};
