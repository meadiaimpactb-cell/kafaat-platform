// منصة كفاءة الأثر — مخطط قاعدة البيانات (MySQL 8) بـ Drizzle ORM
import { relations } from 'drizzle-orm';
import {
  mysqlTable, varchar, text, int, boolean, datetime, decimal, json, mysqlEnum, index, uniqueIndex,
} from 'drizzle-orm/mysql-core';
import { createId } from '@paralleldrive/cuid2';

const id = () => varchar('id', { length: 30 }).primaryKey().$defaultFn(() => createId());
const fk = (name: string) => varchar(name, { length: 30 });
const createdAt = () => datetime('created_at', { mode: 'date' }).notNull().$defaultFn(() => new Date());
const updatedAt = () => datetime('updated_at', { mode: 'date' }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date());
const money = (name: string) => decimal(name, { precision: 16, scale: 2, mode: 'number' });

export const ROLES = ['SUPER_ADMIN', 'ACCOUNT_MANAGER', 'ASSESSOR', 'ORG_USER'] as const;
export const TRACKS = ['EMERGING', 'MEDIUM', 'LARGE'] as const;
export const ASSESSMENT_STATUSES = ['DRAFT', 'AWAITING_PAYMENT', 'DATA_COLLECTION', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'DESK_COMPLETED', 'VERIFICATION', 'CERTIFIED', 'CANCELLED'] as const;
export const ANSWER_STATUSES = ['NONE', 'PARTIAL', 'YES', 'NA'] as const;
export const AI_STATUSES = ['PENDING', 'ANALYZING', 'DONE', 'FAILED', 'SKIPPED'] as const;
export const PHASES = ['DESK', 'VERIFIED'] as const;
export const PRODUCTS = ['CERTIFICATE', 'VERIFICATION_VISIT'] as const;
export const PAYMENT_STATUSES = ['PENDING', 'AWAITING_APPROVAL', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'] as const;
export const VISIT_STATUSES = ['REQUESTED', 'AWAITING_PAYMENT', 'PAID', 'SCHEDULED', 'COMPLETED', 'CANCELLED'] as const;
export const CERT_TYPES = ['UNVERIFIED', 'VERIFIED'] as const;
export const CERT_STATUSES = ['ACTIVE', 'REVOKED', 'EXPIRED'] as const;

export type Role = (typeof ROLES)[number];
export type Track = (typeof TRACKS)[number];
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

// ---------------------------------------------------------------- المستخدمون
export const users = mysqlTable('users', {
  id: id(),
  email: varchar('email', { length: 190 }).notNull(),
  passwordHash: varchar('password_hash', { length: 100 }).notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  role: mysqlEnum('role', ROLES).notNull(),
  permissions: json('permissions').$type<string[]>(), // صلاحيات مدير الحساب
  isFieldVerifier: boolean('is_field_verifier').notNull().default(false),
  specialties: varchar('specialties', { length: 255 }),
  active: boolean('active').notNull().default(true),
  orgId: fk('org_id'),
  orgRole: varchar('org_role', { length: 20 }), // OWNER | MEMBER
  lastLoginAt: datetime('last_login_at', { mode: 'date' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [uniqueIndex('users_email_uq').on(t.email), index('users_role_idx').on(t.role), index('users_org_idx').on(t.orgId)]);

export const sessions = mysqlTable('sessions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: fk('user_id').notNull(),
  expiresAt: datetime('expires_at', { mode: 'date' }).notNull(),
  ip: varchar('ip', { length: 64 }),
  userAgent: varchar('user_agent', { length: 255 }),
  createdAt: createdAt(),
}, t => [index('sessions_user_idx').on(t.userId)]);

// ---------------------------------------------------------------- الجهات
export const organizations = mysqlTable('organizations', {
  id: id(),
  name: varchar('name', { length: 200 }).notNull(),
  nameEn: varchar('name_en', { length: 200 }),
  licenseNo: varchar('license_no', { length: 60 }), // رقم الترخيص
  unifiedNo: varchar('unified_no', { length: 60 }),
  orgType: varchar('org_type', { length: 80 }),
  region: varchar('region', { length: 80 }),
  city: varchar('city', { length: 80 }),
  field: varchar('field', { length: 120 }),
  subFields: json('sub_fields').$type<string[]>(),
  foundedYear: int('founded_year'),
  website: varchar('website', { length: 200 }),
  email: varchar('email', { length: 190 }),
  phone: varchar('phone', { length: 30 }),
  address: varchar('address', { length: 255 }),
  fiscalYearEnd: varchar('fiscal_year_end', { length: 10 }),
  lastYearExpenses: money('last_year_expenses'),
  lastYearRevenue: money('last_year_revenue'),
  programExpenses: money('program_expenses'),
  beneficiariesCount: int('beneficiaries_count'),
  programsCount: int('programs_count'),
  employeesCount: int('employees_count'),
  volunteersCount: int('volunteers_count'),
  track: mysqlEnum('track', TRACKS),
  description: text('description'),
  contactName: varchar('contact_name', { length: 160 }),
  contactTitle: varchar('contact_title', { length: 120 }),
  profileCompleted: boolean('profile_completed').notNull().default(false),
  accountManagerId: fk('account_manager_id'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------- المنهجية
export const factors = mysqlTable('factors', {
  id: varchar('id', { length: 8 }).primaryKey(), // F001
  name: varchar('name', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  score: decimal('score', { precision: 5, scale: 1, mode: 'number' }).notNull(), // درجة العامل في دراسة العوامل
  tier: varchar('tier', { length: 2 }).notNull(),
  rank: int('rank'),
  type: varchar('type', { length: 80 }),
  group: varchar('group_name', { length: 40 }).notNull(),
  axis: int('axis'),
  weight: decimal('weight', { precision: 6, scale: 3, mode: 'number' }),
  roles: json('roles').$type<string[]>().notNull(),
  section: varchar('section', { length: 40 }).notNull(),
  question: text('question').notNull(),
  orgQuestion: text('org_question'),
  definition: text('definition'),
  effect: text('effect'),
  asks: json('asks').$type<string[]>().notNull(),
  evidence: json('evidence').$type<string[]>().notNull(),
  calc: text('calc'),
  levels: json('levels').$type<string[]>().notNull(),
  rule: text('rule'),
  flags: json('flags').$type<string[]>(),
  example: text('example'),
  sortOrder: int('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
});

export const documentRequirements = mysqlTable('document_requirements', {
  id: id(),
  code: varchar('code', { length: 40 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  required: boolean('required').notNull().default(true),
  tracks: json('tracks').$type<Track[]>().notNull(),
  factorIds: json('factor_ids').$type<string[]>().notNull(),
  category: varchar('category', { length: 40 }).notNull(),
  sortOrder: int('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
}, t => [uniqueIndex('docreq_code_uq').on(t.code)]);

// ---------------------------------------------------------------- التقييم
export const assessments = mysqlTable('assessments', {
  id: id(),
  number: varchar('number', { length: 30 }).notNull(),
  orgId: fk('org_id').notNull(),
  cycleYear: int('cycle_year').notNull(), // السنة المالية المقيّمة
  status: mysqlEnum('status', ASSESSMENT_STATUSES).notNull().default('DRAFT'),
  track: mysqlEnum('track', TRACKS),
  expenses: money('expenses'),
  coverage: decimal('coverage', { precision: 5, scale: 2, mode: 'number' }), // نطاق الادعاء
  progress: int('progress').notNull().default(0),
  assessorId: fk('assessor_id'),
  secondAssessorId: fk('second_assessor_id'),
  managerId: fk('manager_id'),
  aiGaps: json('ai_gaps').$type<Record<string, unknown>>(),
  aiGapsAt: datetime('ai_gaps_at', { mode: 'date' }),
  deskResult: json('desk_result').$type<Record<string, unknown>>(),
  finalResult: json('final_result').$type<Record<string, unknown>>(),
  deskScore: decimal('desk_score', { precision: 5, scale: 1, mode: 'number' }),
  deskLevel: varchar('desk_level', { length: 30 }),
  finalScore: decimal('final_score', { precision: 5, scale: 1, mode: 'number' }),
  finalLevel: varchar('final_level', { length: 30 }),
  assessorSummary: text('assessor_summary'),
  recommendations: json('recommendations').$type<{ text: string; factors: string[]; priority: number }[]>(),
  submittedAt: datetime('submitted_at', { mode: 'date' }),
  reviewStartedAt: datetime('review_started_at', { mode: 'date' }),
  deskCompletedAt: datetime('desk_completed_at', { mode: 'date' }),
  certifiedAt: datetime('certified_at', { mode: 'date' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [uniqueIndex('assess_number_uq').on(t.number), index('assess_status_idx').on(t.status), index('assess_org_idx').on(t.orgId)]);

export const answers = mysqlTable('assessment_answers', {
  id: id(),
  assessmentId: fk('assessment_id').notNull(),
  factorId: varchar('factor_id', { length: 8 }).notNull(),
  status: mysqlEnum('status', ANSWER_STATUSES),
  selfLevel: int('self_level'),
  answer: text('answer'),
  updatedAt: updatedAt(),
}, t => [uniqueIndex('answer_uq').on(t.assessmentId, t.factorId)]);

export const documents = mysqlTable('documents', {
  id: id(),
  assessmentId: fk('assessment_id').notNull(),
  uploadedById: fk('uploaded_by_id'),
  requirementId: fk('requirement_id'),
  factorIds: json('factor_ids').$type<string[]>(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  storedPath: varchar('stored_path', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 120 }).notNull(),
  size: int('size').notNull(),
  sha256: varchar('sha256', { length: 64 }).notNull(),
  aiStatus: mysqlEnum('ai_status', AI_STATUSES).notNull().default('PENDING'),
  aiResult: json('ai_result').$type<Record<string, unknown>>(),
  aiError: text('ai_error'),
  docType: varchar('doc_type', { length: 120 }),
  createdAt: createdAt(),
}, t => [index('docs_assess_idx').on(t.assessmentId)]);

export const factorReviews = mysqlTable('factor_reviews', {
  id: id(),
  assessmentId: fk('assessment_id').notNull(),
  factorId: varchar('factor_id', { length: 8 }).notNull(),
  phase: mysqlEnum('phase', PHASES).notNull().default('DESK'),
  level: int('level'),
  aiLevel: int('ai_level'),
  aiConfidence: decimal('ai_confidence', { precision: 4, scale: 2, mode: 'number' }),
  aiRationale: text('ai_rationale'),
  justification: text('justification'),
  evidenceRef: varchar('evidence_ref', { length: 500 }),
  needsVerification: boolean('needs_verification').notNull().default(false),
  reviewerId: fk('reviewer_id'),
  updatedAt: updatedAt(),
}, t => [uniqueIndex('review_uq').on(t.assessmentId, t.factorId, t.phase)]);

export const infoRequests = mysqlTable('info_requests', {
  id: id(),
  assessmentId: fk('assessment_id').notNull(),
  factorId: varchar('factor_id', { length: 8 }),
  message: text('message').notNull(),
  response: text('response'),
  status: mysqlEnum('status', ['OPEN', 'ANSWERED', 'CLOSED']).notNull().default('OPEN'),
  createdById: fk('created_by_id').notNull(),
  createdAt: createdAt(),
  answeredAt: datetime('answered_at', { mode: 'date' }),
});

// ---------------------------------------------------------------- المدفوعات
export const payments = mysqlTable('payments', {
  id: id(),
  number: varchar('number', { length: 30 }).notNull(),
  orgId: fk('org_id').notNull(),
  assessmentId: fk('assessment_id'),
  product: mysqlEnum('product', PRODUCTS).notNull(),
  listPrice: money('list_price').notNull(),
  discount: money('discount').notNull().default(0),
  subtotal: money('subtotal').notNull(), // قبل الضريبة
  vat: money('vat').notNull(),
  total: money('total').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('SAR'),
  couponId: fk('coupon_id'),
  gateway: varchar('gateway', { length: 30 }),
  status: mysqlEnum('status', PAYMENT_STATUSES).notNull().default('PENDING'),
  providerRef: varchar('provider_ref', { length: 120 }),
  providerData: json('provider_data').$type<Record<string, unknown>>(),
  receiptPath: varchar('receipt_path', { length: 255 }),
  paidAt: datetime('paid_at', { mode: 'date' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [uniqueIndex('pay_number_uq').on(t.number), index('pay_status_idx').on(t.status)]);

export const invoices = mysqlTable('invoices', {
  id: id(),
  number: varchar('number', { length: 30 }).notNull(),
  paymentId: fk('payment_id').notNull(),
  issuedAt: createdAt(),
  data: json('data').$type<Record<string, unknown>>().notNull(),
}, t => [uniqueIndex('inv_number_uq').on(t.number), uniqueIndex('inv_payment_uq').on(t.paymentId)]);

export const paymentGateways = mysqlTable('payment_gateways', {
  id: varchar('id', { length: 30 }).primaryKey(), // sandbox | moyasar | tap | bank_transfer
  name: varchar('name', { length: 80 }).notNull(),
  enabled: boolean('enabled').notNull().default(false),
  mode: varchar('mode', { length: 10 }).notNull().default('TEST'),
  config: json('config').$type<Record<string, string>>(), // القيم السرية مشفرة
  sortOrder: int('sort_order').notNull().default(0),
  updatedAt: updatedAt(),
});

export const coupons = mysqlTable('coupons', {
  id: id(),
  code: varchar('code', { length: 40 }).notNull(),
  type: mysqlEnum('type', ['PERCENT', 'FIXED']).notNull(),
  value: decimal('value', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  product: varchar('product', { length: 30 }).notNull().default('ALL'),
  maxUses: int('max_uses'),
  used: int('used').notNull().default(0),
  expiresAt: datetime('expires_at', { mode: 'date' }),
  active: boolean('active').notNull().default(true),
  note: varchar('note', { length: 255 }),
  createdAt: createdAt(),
}, t => [uniqueIndex('coupon_code_uq').on(t.code)]);

export const settings = mysqlTable('settings', {
  key: varchar('key', { length: 80 }).primaryKey(),
  value: json('value').notNull(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------- الزيارة والشهادات
export const visits = mysqlTable('visits', {
  id: id(),
  assessmentId: fk('assessment_id').notNull(),
  consultantId: fk('consultant_id'),
  status: mysqlEnum('status', VISIT_STATUSES).notNull().default('REQUESTED'),
  preferredDates: varchar('preferred_dates', { length: 255 }),
  scheduledAt: datetime('scheduled_at', { mode: 'date' }),
  location: varchar('location', { length: 255 }),
  checklist: json('checklist').$type<Record<string, boolean>>(),
  sampleResult: json('sample_result').$type<{ checked: number; matched: number; notes?: string }>(),
  notes: text('notes'),
  completedAt: datetime('completed_at', { mode: 'date' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [uniqueIndex('visit_assess_uq').on(t.assessmentId)]);

export const certificates = mysqlTable('certificates', {
  id: id(),
  number: varchar('number', { length: 30 }).notNull(),
  assessmentId: fk('assessment_id').notNull(),
  orgId: fk('org_id').notNull(),
  type: mysqlEnum('type', CERT_TYPES).notNull(),
  score: decimal('score', { precision: 5, scale: 1, mode: 'number' }).notNull(),
  level: varchar('level', { length: 30 }).notNull(),
  coverage: decimal('coverage', { precision: 5, scale: 2, mode: 'number' }),
  periodYear: int('period_year').notNull(),
  issuedAt: createdAt(),
  validUntil: datetime('valid_until', { mode: 'date' }).notNull(),
  verifyCode: varchar('verify_code', { length: 24 }).notNull(),
  status: mysqlEnum('status', CERT_STATUSES).notNull().default('ACTIVE'),
  snapshot: json('snapshot').$type<Record<string, unknown>>().notNull(),
  revokedReason: varchar('revoked_reason', { length: 255 }),
}, t => [uniqueIndex('cert_number_uq').on(t.number), uniqueIndex('cert_verify_uq').on(t.verifyCode)]);

// ---------------------------------------------------------------- الإشعارات والسجل
export const notifications = mysqlTable('notifications', {
  id: id(),
  userId: fk('user_id').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  body: text('body'),
  link: varchar('link', { length: 255 }),
  readAt: datetime('read_at', { mode: 'date' }),
  createdAt: createdAt(),
}, t => [index('notif_user_idx').on(t.userId)]);

export const activityLogs = mysqlTable('activity_logs', {
  id: id(),
  assessmentId: fk('assessment_id'),
  userId: fk('user_id'),
  action: varchar('action', { length: 80 }).notNull(),
  details: json('details').$type<Record<string, unknown>>(),
  createdAt: createdAt(),
}, t => [index('act_assess_idx').on(t.assessmentId)]);

export const counters = mysqlTable('counters', {
  key: varchar('key', { length: 40 }).primaryKey(),
  value: int('value').notNull().default(0),
});

// ---------------------------------------------------------------- العلاقات
export const usersRel = relations(users, ({ one, many }) => ({
  org: one(organizations, { fields: [users.orgId], references: [organizations.id] }),
  notifications: many(notifications),
}));
export const orgsRel = relations(organizations, ({ one, many }) => ({
  users: many(users),
  assessments: many(assessments),
  payments: many(payments),
  certificates: many(certificates),
  accountManager: one(users, { fields: [organizations.accountManagerId], references: [users.id] }),
}));
export const assessmentsRel = relations(assessments, ({ one, many }) => ({
  org: one(organizations, { fields: [assessments.orgId], references: [organizations.id] }),
  assessor: one(users, { fields: [assessments.assessorId], references: [users.id], relationName: 'assessor' }),
  manager: one(users, { fields: [assessments.managerId], references: [users.id], relationName: 'manager' }),
  answers: many(answers),
  documents: many(documents),
  reviews: many(factorReviews),
  infoRequests: many(infoRequests),
  payments: many(payments),
  visit: one(visits, { fields: [assessments.id], references: [visits.assessmentId] }),
  certificates: many(certificates),
  activities: many(activityLogs),
}));
export const answersRel = relations(answers, ({ one }) => ({ assessment: one(assessments, { fields: [answers.assessmentId], references: [assessments.id] }), factor: one(factors, { fields: [answers.factorId], references: [factors.id] }) }));
export const documentsRel = relations(documents, ({ one }) => ({ assessment: one(assessments, { fields: [documents.assessmentId], references: [assessments.id] }), requirement: one(documentRequirements, { fields: [documents.requirementId], references: [documentRequirements.id] }), uploadedBy: one(users, { fields: [documents.uploadedById], references: [users.id] }) }));
export const reviewsRel = relations(factorReviews, ({ one }) => ({ assessment: one(assessments, { fields: [factorReviews.assessmentId], references: [assessments.id] }), factor: one(factors, { fields: [factorReviews.factorId], references: [factors.id] }), reviewer: one(users, { fields: [factorReviews.reviewerId], references: [users.id] }) }));
export const infoRel = relations(infoRequests, ({ one }) => ({ assessment: one(assessments, { fields: [infoRequests.assessmentId], references: [assessments.id] }), createdBy: one(users, { fields: [infoRequests.createdById], references: [users.id] }) }));
export const paymentsRel = relations(payments, ({ one }) => ({ org: one(organizations, { fields: [payments.orgId], references: [organizations.id] }), assessment: one(assessments, { fields: [payments.assessmentId], references: [assessments.id] }), invoice: one(invoices, { fields: [payments.id], references: [invoices.paymentId] }), coupon: one(coupons, { fields: [payments.couponId], references: [coupons.id] }) }));
export const invoicesRel = relations(invoices, ({ one }) => ({ payment: one(payments, { fields: [invoices.paymentId], references: [payments.id] }) }));
export const visitsRel = relations(visits, ({ one }) => ({ assessment: one(assessments, { fields: [visits.assessmentId], references: [assessments.id] }), consultant: one(users, { fields: [visits.consultantId], references: [users.id] }) }));
export const certificatesRel = relations(certificates, ({ one }) => ({ assessment: one(assessments, { fields: [certificates.assessmentId], references: [assessments.id] }), org: one(organizations, { fields: [certificates.orgId], references: [organizations.id] }) }));
export const activityRel = relations(activityLogs, ({ one }) => ({ assessment: one(assessments, { fields: [activityLogs.assessmentId], references: [assessments.id] }), user: one(users, { fields: [activityLogs.userId], references: [users.id] }) }));
export const notificationsRel = relations(notifications, ({ one }) => ({ user: one(users, { fields: [notifications.userId], references: [users.id] }) }));
