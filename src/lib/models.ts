/**
 * PySecure domain models — Step 1 of the rebuild.
 *
 * These types describe the target data model for a real backend/database.
 * They are intentionally NOT wired into any route yet. `src/lib/pysecure.ts`
 * remains the live data layer that the app currently runs on; nothing here
 * changes existing behaviour.
 *
 * Design notes:
 *  - Every entity carries `createdAt` / `updatedAt` audit timestamps.
 *  - Relationships are expressed as explicit foreign-key id fields
 *    (`examId`, `studentId`, `attemptId`, ...) rather than nested objects,
 *    so the shape maps cleanly onto relational tables later.
 *  - Passwords are modeled as `passwordHash` everywhere — plaintext storage
 *    is not represented as a valid state in the target model.
 *  - `TestAttempt` (an in-progress or finished exam session) is modeled
 *    separately from `Result` (the graded outcome), and from `Answer`
 *    (a single per-question code submission). The current app conflates
 *    these three concepts into one `Result` object.
 *  - `Violation.source` is mandatory and explicit. This is the fix for
 *    "no fake/random monitoring data": a violation must declare whether it
 *    came from a real browser event, a real vision-model inference, or a
 *    manual faculty review — there is no way to record one that pretends
 *    to be something it isn't.
 */

/* --------------------------------- shared -------------------------------- */

export type ISODateString = string;

export interface AuditedEntity {
  id: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* --------------------------------- people --------------------------------- */

export type Gender = "Male" | "Female" | "Other";

export interface Student extends AuditedEntity {
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: ISODateString;
  registerNumber: string;
  department: string;
  year: string;
  section: string;
  email: string;
  phone: string;
  /** Never store plaintext. Hashing happens at the auth boundary, not here. */
  passwordHash: string;
  photoUrl?: string;
}

export interface Faculty extends AuditedEntity {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  department?: string;
  designation?: string;
  /** Soft-disable instead of deleting, so exam history stays attributable. */
  isActive: boolean;
}

export interface Admin extends AuditedEntity {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
}

export type UserRole = "student" | "faculty" | "admin";

/** What a validated session actually needs — no password, no PII beyond id. */
export interface AuthSession {
  role: UserRole;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  issuedAt: ISODateString;
  expiresAt: ISODateString;
}

/* ------------------------------ exams/questions ---------------------------- */

export type Difficulty = "Easy" | "Medium" | "Hard";
export type ExamStatus = "draft" | "published" | "archived";

export interface TestCase {
  input: string;
  output: string;
}

export interface Question extends AuditedEntity {
  examId: string;
  topic: string;
  title: string;
  prompt: string;
  /** Faculty never sets this directly — inferred, but stored explicitly. */
  difficulty: Difficulty;
  hint: string;
  starterCode: string;
  sampleTestCases: TestCase[];
  hiddenTestCases: TestCase[];
  constraints: string[];
  inputFormat?: string;
  outputFormat?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  /** Position within the exam's question palette. */
  order: number;
}

export interface Exam extends AuditedEntity {
  title: string;
  createdByFacultyId: string;
  topics: string[];
  durationMinutes: number;
  status: ExamStatus;
  /** Cohort targeting — absent in the current app, required for real use. */
  targetDepartment?: string;
  targetYear?: string;
  targetSection?: string;
  scheduledStart?: ISODateString;
  scheduledEnd?: ISODateString;
  /** Bumped on every published edit; drives re-evaluation. */
  version: number;
}

/* -------------------------------- attempts --------------------------------- */

export type AttemptStatus = "in_progress" | "submitted" | "auto_submitted" | "abandoned";

export interface TestAttempt extends AuditedEntity {
  examId: string;
  studentId: string;
  status: AttemptStatus;
  startedAt: ISODateString;
  submittedAt?: ISODateString;
  /** Snapshot of the trust score at submission time, not the live value. */
  finalTrustScore?: number;
}

export interface Answer extends AuditedEntity {
  attemptId: string;
  questionId: string;
  code: string;
  passed: boolean;
  submittedAt: ISODateString;
}

/* --------------------------------- results ---------------------------------- */

export interface Result extends AuditedEntity {
  attemptId: string;
  studentId: string;
  examId: string;
  score: number;
  totalQuestions: number;
  trustScore: number;
  violationCount: number;
  gradedAt: ISODateString;
  reevaluatedAt?: ISODateString;
}

/* ----------------------------- monitoring/integrity -------------------------- */

/**
 * Where a violation record actually came from. Mandatory by design: a
 * violation can never be written without declaring its source, so
 * placeholder/random data can't silently masquerade as a real detection.
 */
export type ViolationSource =
  | "browser_event" // tab switch, fullscreen exit, blur, blocked shortcut, clipboard — all real, verifiable in-browser
  | "vision_model" // a real face/object/gaze inference from an actual model — none exists yet
  | "manual_review"; // a faculty member flagged it by hand

export type ViolationSeverity = "low" | "medium" | "high";

export interface Violation extends AuditedEntity {
  attemptId: string;
  studentId: string;
  type: string;
  penalty: number;
  source: ViolationSource;
  severity: ViolationSeverity;
  occurredAt: ISODateString;
}

/** A point-in-time trust-score change, one per violation, for audit/history. */
export interface MonitoringEvent extends AuditedEntity {
  attemptId: string;
  violationId: string;
  trustScoreAfter: number;
  occurredAt: ISODateString;
}

/* --------------------------------- analytics ---------------------------------- */

export interface ExamAnalytics {
  examId: string;
  totalAttempts: number;
  averageScore: number;
  averageTrustScore: number;
  violationBreakdown: Record<string, number>;
  /** Computed from real Answer records — never a hardcoded placeholder array. */
  topicAccuracy: Record<string, number>;
  computedAt: ISODateString;
}
