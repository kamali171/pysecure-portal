/**
 * Repository interfaces — the seam between the app and however data is
 * actually persisted.
 *
 * Every method returns a Promise on purpose, even though today's only
 * implementation (`local-storage.ts`) is synchronous under the hood. That
 * keeps every caller written against these interfaces already compatible
 * with a real async database client later, with no call-site changes.
 *
 * Nothing in the app imports from this module yet — see the Step 1 summary.
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

export interface CrudRepository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface StudentRepository extends CrudRepository<Student> {
  findByRegisterNumberOrEmail(value: string): Promise<Student | null>;
}

export interface FacultyRepository extends CrudRepository<Faculty> {
  findByEmail(email: string): Promise<Faculty | null>;
}

export interface AdminRepository extends CrudRepository<Admin> {
  findByEmail(email: string): Promise<Admin | null>;
}

export interface ExamRepository extends CrudRepository<Exam> {
  findPublished(): Promise<Exam[]>;
  findForCohort(department: string, year: string, section: string): Promise<Exam[]>;
}

export interface QuestionRepository extends CrudRepository<Question> {
  findByExam(examId: string): Promise<Question[]>;
}

export interface TestAttemptRepository extends CrudRepository<TestAttempt> {
  findByStudent(studentId: string): Promise<TestAttempt[]>;
  findByExam(examId: string): Promise<TestAttempt[]>;
}

export interface AnswerRepository extends CrudRepository<Answer> {
  findByAttempt(attemptId: string): Promise<Answer[]>;
}

export interface ResultRepository extends CrudRepository<Result> {
  findByStudent(studentId: string): Promise<Result[]>;
  findByExam(examId: string): Promise<Result[]>;
}

export interface ViolationRepository extends CrudRepository<Violation> {
  findByAttempt(attemptId: string): Promise<Violation[]>;
}

export interface MonitoringEventRepository extends CrudRepository<MonitoringEvent> {
  findByAttempt(attemptId: string): Promise<MonitoringEvent[]>;
}

/** Analytics is read/compute-only — there's nothing to create/update/delete. */
export interface AnalyticsRepository {
  computeForExam(examId: string): Promise<ExamAnalytics>;
}
