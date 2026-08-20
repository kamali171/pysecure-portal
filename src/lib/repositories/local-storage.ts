/**
 * localStorage-backed implementation of the repository interfaces.
 *
 * This exists purely to prove the data model / repository seam out end to
 * end. It intentionally uses a separate storage namespace (`pysecure.v2.*`)
 * from the app's current live data (`pysecure.*`, defined in
 * `src/lib/pysecure.ts`) so it cannot collide with or corrupt anything the
 * running app depends on today.
 *
 * Swapping this file for a real database client later is the only change
 * required — every route continues to depend on the interfaces in
 * `./types`, not on `localStorage` directly.
 */

import type {
  Admin,
  Answer,
  Exam,
  ExamAnalytics,
  Faculty,
  MonitoringEvent,
  Question,
  Result,
  Student,
  TestAttempt,
  Violation,
} from "../models";
import type {
  AdminRepository,
  AnalyticsRepository,
  AnswerRepository,
  CrudRepository,
  ExamRepository,
  FacultyRepository,
  MonitoringEventRepository,
  QuestionRepository,
  ResultRepository,
  StudentRepository,
  TestAttemptRepository,
  ViolationRepository,
} from "./types";

const NAMESPACE = "pysecure.v2";

function readCollection<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeCollection<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

/** Generic CRUD over a namespaced localStorage array, shared by every repo below. */
class LocalStorageCrudRepository<T extends { id: string }> implements CrudRepository<T> {
  protected readonly key: string;

  constructor(collectionName: string) {
    this.key = `${NAMESPACE}.${collectionName}`;
  }

  protected all(): T[] {
    return readCollection<T>(this.key);
  }

  protected persist(items: T[]) {
    writeCollection(this.key, items);
  }

  async findById(id: string): Promise<T | null> {
    return this.all().find((item) => item.id === id) ?? null;
  }

  async findAll(): Promise<T[]> {
    return this.all();
  }

  async create(entity: T): Promise<T> {
    this.persist([...this.all(), entity]);
    return entity;
  }

  async update(entity: T): Promise<T> {
    const items = this.all();
    const idx = items.findIndex((item) => item.id === entity.id);
    if (idx === -1) throw new Error(`Cannot update — entity ${entity.id} not found`);
    items[idx] = entity;
    this.persist(items);
    return entity;
  }

  async delete(id: string): Promise<void> {
    this.persist(this.all().filter((item) => item.id !== id));
  }
}

/* ---------------------------------- people ---------------------------------- */

class LocalStorageStudentRepository
  extends LocalStorageCrudRepository<Student>
  implements StudentRepository
{
  constructor() {
    super("students");
  }

  async findByRegisterNumberOrEmail(value: string): Promise<Student | null> {
    const key = value.trim().toLowerCase();
    return (
      this.all().find(
        (s) => s.registerNumber.toLowerCase() === key || s.email.toLowerCase() === key,
      ) ?? null
    );
  }
}

class LocalStorageFacultyRepository
  extends LocalStorageCrudRepository<Faculty>
  implements FacultyRepository
{
  constructor() {
    super("faculty");
  }

  async findByEmail(email: string): Promise<Faculty | null> {
    const key = email.trim().toLowerCase();
    return this.all().find((f) => f.email.toLowerCase() === key) ?? null;
  }
}

class LocalStorageAdminRepository
  extends LocalStorageCrudRepository<Admin>
  implements AdminRepository
{
  constructor() {
    super("admins");
  }

  async findByEmail(email: string): Promise<Admin | null> {
    const key = email.trim().toLowerCase();
    return this.all().find((a) => a.email.toLowerCase() === key) ?? null;
  }
}

/* ------------------------------ exams/questions ------------------------------ */

class LocalStorageExamRepository
  extends LocalStorageCrudRepository<Exam>
  implements ExamRepository
{
  constructor() {
    super("exams");
  }

  async findPublished(): Promise<Exam[]> {
    return this.all().filter((e) => e.status === "published");
  }

  async findForCohort(department: string, year: string, section: string): Promise<Exam[]> {
    return this.all().filter(
      (e) =>
        e.status === "published" &&
        (!e.targetDepartment || e.targetDepartment === department) &&
        (!e.targetYear || e.targetYear === year) &&
        (!e.targetSection || e.targetSection === section),
    );
  }
}

class LocalStorageQuestionRepository
  extends LocalStorageCrudRepository<Question>
  implements QuestionRepository
{
  constructor() {
    super("questions");
  }

  async findByExam(examId: string): Promise<Question[]> {
    return this.all()
      .filter((q) => q.examId === examId)
      .sort((a, b) => a.order - b.order);
  }
}

/* -------------------------------- attempts ------------------------------------ */

class LocalStorageTestAttemptRepository
  extends LocalStorageCrudRepository<TestAttempt>
  implements TestAttemptRepository
{
  constructor() {
    super("attempts");
  }

  async findByStudent(studentId: string): Promise<TestAttempt[]> {
    return this.all().filter((a) => a.studentId === studentId);
  }

  async findByExam(examId: string): Promise<TestAttempt[]> {
    return this.all().filter((a) => a.examId === examId);
  }
}

class LocalStorageAnswerRepository
  extends LocalStorageCrudRepository<Answer>
  implements AnswerRepository
{
  constructor() {
    super("answers");
  }

  async findByAttempt(attemptId: string): Promise<Answer[]> {
    return this.all().filter((a) => a.attemptId === attemptId);
  }
}

/* --------------------------------- results ------------------------------------- */

class LocalStorageResultRepository
  extends LocalStorageCrudRepository<Result>
  implements ResultRepository
{
  constructor() {
    super("results");
  }

  async findByStudent(studentId: string): Promise<Result[]> {
    return this.all().filter((r) => r.studentId === studentId);
  }

  async findByExam(examId: string): Promise<Result[]> {
    return this.all().filter((r) => r.examId === examId);
  }
}

/* ----------------------------- monitoring/integrity ------------------------------ */

class LocalStorageViolationRepository
  extends LocalStorageCrudRepository<Violation>
  implements ViolationRepository
{
  constructor() {
    super("violations");
  }

  async findByAttempt(attemptId: string): Promise<Violation[]> {
    return this.all().filter((v) => v.attemptId === attemptId);
  }
}

class LocalStorageMonitoringEventRepository
  extends LocalStorageCrudRepository<MonitoringEvent>
  implements MonitoringEventRepository
{
  constructor() {
    super("monitoring-events");
  }

  async findByAttempt(attemptId: string): Promise<MonitoringEvent[]> {
    return this.all().filter((e) => e.attemptId === attemptId);
  }
}

/* --------------------------------- analytics -------------------------------------- */

class LocalStorageAnalyticsRepository implements AnalyticsRepository {
  constructor(
    private readonly results: ResultRepository,
    private readonly violations: LocalStorageCrudRepository<Violation> & {
      findByAttempt(attemptId: string): Promise<Violation[]>;
    },
    private readonly attempts: TestAttemptRepository,
    private readonly answers: AnswerRepository,
    private readonly questions: QuestionRepository,
  ) {}

  async computeForExam(examId: string): Promise<ExamAnalytics> {
    const results = await this.results.findByExam(examId);
    const attempts = await this.attempts.findByExam(examId);
    const questions = await this.questions.findByExam(examId);

    const totalAttempts = attempts.length;
    const averageScore = results.length
      ? Math.round(
          (results.reduce((sum, r) => sum + r.score / r.totalQuestions, 0) / results.length) * 100,
        )
      : 0;
    const averageTrustScore = results.length
      ? Math.round(results.reduce((sum, r) => sum + r.trustScore, 0) / results.length)
      : 100;

    const violationBreakdown: Record<string, number> = {};
    for (const attempt of attempts) {
      const attemptViolations = await this.violations.findByAttempt(attempt.id);
      for (const v of attemptViolations) {
        violationBreakdown[v.type] = (violationBreakdown[v.type] ?? 0) + 1;
      }
    }

    // Real topic accuracy, computed from actual Answer records — never a
    // hardcoded placeholder array like the current app's Results page uses.
    const topicAccuracy: Record<string, number> = {};
    const topicTotals: Record<string, { correct: number; total: number }> = {};
    for (const attempt of attempts) {
      const attemptAnswers = await this.answers.findByAttempt(attempt.id);
      for (const answer of attemptAnswers) {
        const question = questions.find((q) => q.id === answer.questionId);
        if (!question) continue;
        const bucket = topicTotals[question.topic] ?? { correct: 0, total: 0 };
        bucket.total += 1;
        if (answer.passed) bucket.correct += 1;
        topicTotals[question.topic] = bucket;
      }
    }
    for (const [topic, { correct, total }] of Object.entries(topicTotals)) {
      topicAccuracy[topic] = total ? Math.round((correct / total) * 100) : 0;
    }

    return {
      examId,
      totalAttempts,
      averageScore,
      averageTrustScore,
      violationBreakdown,
      topicAccuracy,
      computedAt: new Date().toISOString(),
    };
  }
}

/* ------------------------------ wired-up singletons -------------------------------- */

export const studentRepository = new LocalStorageStudentRepository();
export const facultyRepository = new LocalStorageFacultyRepository();
export const adminRepository = new LocalStorageAdminRepository();
export const examRepository = new LocalStorageExamRepository();
export const questionRepository = new LocalStorageQuestionRepository();
export const testAttemptRepository = new LocalStorageTestAttemptRepository();
export const answerRepository = new LocalStorageAnswerRepository();
export const resultRepository = new LocalStorageResultRepository();
export const violationRepository = new LocalStorageViolationRepository();
export const monitoringEventRepository = new LocalStorageMonitoringEventRepository();
export const analyticsRepository = new LocalStorageAnalyticsRepository(
  resultRepository,
  violationRepository,
  testAttemptRepository,
  answerRepository,
  questionRepository,
);
