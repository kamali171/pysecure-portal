/**
 * Repository barrel export.
 *
 * Nothing in the running app imports from here yet — this is the seam
 * prepared in Step 1 for later wiring. See docs/step-1-data-layer.md.
 */

export * from "./types";
export {
  studentRepository,
  facultyRepository,
  adminRepository,
  examRepository,
  questionRepository,
  testAttemptRepository,
  answerRepository,
  resultRepository,
  violationRepository,
  monitoringEventRepository,
  analyticsRepository,
} from "./local-storage";
