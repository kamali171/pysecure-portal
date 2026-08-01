// PySecure demo data layer (browser localStorage backed).
// Swap for Lovable Cloud later without changing component APIs.

export type Difficulty = "Easy" | "Medium" | "Hard";

export type UserRole = "student" | "faculty" | "admin";

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  regNo: string;
  department: string;
  year: string;
  section: string;
  email: string;
  phone: string;
  password: string;
  photo?: string;
};

export type AuthSession = {
  role: UserRole;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  regNo?: string;
  department?: string;
  year?: string;
  section?: string;
  password?: string;
};

export type Question = {
  id: string;
  topic: string;
  title: string;
  prompt: string;
  difficulty: Difficulty;
  hint: string;
  expectedOutput: string;
  testCases: { input: string; output: string }[];
  starter: string;
};

export type Test = {
  id: string;
  title: string;
  topics: string[];
  date: string;
  durationMin: number;
  questions: Question[];
};

export type Result = {
  id: string;
  studentId: string;
  testId: string;
  testTitle: string;
  score: number;
  total: number;
  trustScore: number;
  violations: number;
  date: string;
};

export type Violation = {
  id: string;
  studentId: string;
  studentName: string;
  type: string;
  penalty: number;
  at: string;
};

export const TOPICS = [
  "Variables & Data Types",
  "Operators",
  "Conditionals",
  "Loops",
  "Strings",
  "Lists & Tuples",
  "Dictionaries & Sets",
  "Functions",
  "Recursion",
  "File Handling",
  "Exception Handling",
  "OOP in Python",
];

export const DEPARTMENTS = ["CSE", "IT", "AI & DS", "ECE", "EEE", "MECH", "CIVIL"];
export const YEARS = ["I", "II", "III", "IV"];
export const SECTIONS = ["A", "B", "C"];

const KEYS = {
  students: "pysecure.students",
  tests: "pysecure.tests",
  results: "pysecure.results",
  violations: "pysecure.violations",
  session: "pysecure.session",
  notices: "pysecure.notices",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------------- AI-style generators (deterministic, offline) --------------- */

const HARD_HINTS = ["recursion", "class", "generator", "decorator", "matrix", "dynamic"];
const MED_HINTS = ["dictionary", "set", "file", "exception", "slice", "comprehension"];

export function inferDifficulty(prompt: string): Difficulty {
  const p = prompt.toLowerCase();
  if (HARD_HINTS.some((k) => p.includes(k)) || p.length > 260) return "Hard";
  if (MED_HINTS.some((k) => p.includes(k)) || p.length > 130) return "Medium";
  return "Easy";
}

export function generateHint(topic: string, prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("recursion")) return "Define the base case first, then reduce the input toward it on each call.";
  if (p.includes("dictionary") || p.includes("dict"))
    return "Use a dict to count or map values — `d[k] = d.get(k, 0) + 1` avoids KeyError.";
  if (p.includes("string")) return "Remember strings are immutable; build results with a list and ''.join().";
  if (p.includes("list")) return "A list comprehension keeps the transform + filter in a single readable line.";
  if (p.includes("file")) return "Open files with `with open(path) as f:` so they close automatically.";
  if (p.includes("class") || p.includes("object"))
    return "Store state in __init__ and expose behaviour through methods; use self consistently.";
  if (p.includes("loop") || p.includes("sum") || p.includes("print"))
    return "Track your accumulator outside the loop and update it on every iteration.";
  return `Break the problem into read input → apply ${topic.toLowerCase()} logic → print the result.`;
}

export function generateTestCases(prompt: string) {
  const p = prompt.toLowerCase();
  if (p.includes("even")) return [{ input: "10", output: "2 4 6 8 10" }, { input: "4", output: "2 4" }];
  if (p.includes("reverse")) return [{ input: "python", output: "nohtyp" }, { input: "kiot", output: "toik" }];
  if (p.includes("factorial")) return [{ input: "5", output: "120" }, { input: "0", output: "1" }];
  if (p.includes("palindrome")) return [{ input: "madam", output: "True" }, { input: "kiot", output: "False" }];
  return [{ input: "5", output: "15" }, { input: "3", output: "6" }];
}

/* ---------------------------------- seed ---------------------------------- */

function q(
  topic: string,
  title: string,
  prompt: string,
  starter: string,
  expectedOutput: string,
): Question {
  return {
    id: uid(),
    topic,
    title,
    prompt,
    difficulty: inferDifficulty(prompt),
    hint: generateHint(topic, prompt),
    expectedOutput,
    testCases: generateTestCases(prompt),
    starter,
  };
}

function seedTest(): Test {
  return {
    id: "daily-" + new Date().toISOString().slice(0, 10),
    title: "Daily Python Assessment",
    topics: ["Loops", "Strings", "Functions", "Recursion"],
    date: new Date().toISOString(),
    durationMin: 60,
    questions: [
      q(
        "Loops",
        "Print Even Numbers",
        "Read an integer N and print all even numbers from 1 to N separated by a space on one line.",
        "n = int(input())\n# your code here\n",
        "2 4 6 8 10",
      ),
      q(
        "Strings",
        "Reverse a String",
        "Read a string and print its reverse without using any built-in reverse function. Remember strings are immutable in Python.",
        "s = input()\n# your code here\n",
        "nohtyp",
      ),
      q(
        "Recursion",
        "Factorial",
        "Write a recursion based function factorial(n) that returns n! and print the result for the input value. Handle the base case for 0.",
        "def factorial(n):\n    # your code here\n    pass\n\nprint(factorial(int(input())))\n",
        "120",
      ),
      q(
        "Dictionaries & Sets",
        "Character Frequency",
        "Read a word and print each unique character with its frequency using a dictionary, one pair per line in first-seen order.",
        "s = input()\n# your code here\n",
        "p 1\ny 1\nt 1\nh 1\no 1\nn 1",
      ),
      q(
        "Functions",
        "Sum of Digits",
        "Read an integer and print the sum of its digits.",
        "n = input()\n# your code here\n",
        "15",
      ),
    ],
  };
}

/* ---------------------------------- API ----------------------------------- */

export function getTests(): Test[] {
  const t = read<Test[]>(KEYS.tests, []);
  if (t.length === 0) {
    const seeded = [seedTest()];
    write(KEYS.tests, seeded);
    return seeded;
  }
  return t;
}
export function saveTest(test: Test) {
  write(KEYS.tests, [test, ...getTests()]);
}
export function activeTest(): Test {
  return getTests()[0];
}

export function getStudents(): Student[] {
  return read<Student[]>(KEYS.students, []);
}
export function addStudent(s: Student) {
  write(KEYS.students, [...getStudents(), s]);
}

const DEMO_ACCOUNTS: Record<Exclude<UserRole, "student">, AuthSession> = {
  faculty: {
    role: "faculty",
    id: "faculty-demo",
    firstName: "Faculty",
    lastName: "User",
    email: "faculty@kiot.ac.in",
    password: "faculty123",
  },
  admin: {
    role: "admin",
    id: "admin-demo",
    firstName: "Admin",
    lastName: "User",
    email: "admin@kiot.ac.in",
    password: "admin123",
  },
};

export function login(regOrEmail: string, password: string): Student | null {
  const key = regOrEmail.trim().toLowerCase();
  return (
    getStudents().find(
      (s) =>
        (s.regNo.toLowerCase() === key || s.email.toLowerCase() === key) && s.password === password,
    ) ?? null
  );
}

export function loginAsRole(role: UserRole, regOrEmail: string, password: string): AuthSession | null {
  if (role === "student") {
    const student = login(regOrEmail, password);
    if (!student) return null;
    return {
      role: "student",
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      regNo: student.regNo,
      department: student.department,
      year: student.year,
      section: student.section,
      password: student.password,
    };
  }

  const account = DEMO_ACCOUNTS[role];
  const normalized = regOrEmail.trim().toLowerCase();
  if (
    (normalized === account.email.toLowerCase() || normalized === account.firstName.toLowerCase()) &&
    password === account.password
  ) {
    return account;
  }

  return null;
}

export function setSession(s: AuthSession | null) {
  if (!s) window.localStorage.removeItem(KEYS.session);
  else write(KEYS.session, s);
}
export function getSession(): AuthSession | null {
  const stored = read<Partial<AuthSession> | null>(KEYS.session, null);
  if (!stored) return null;
  return {
    role: stored.role ?? "student",
    id: stored.id ?? "",
    firstName: stored.firstName ?? "User",
    lastName: stored.lastName ?? "",
    email: stored.email ?? "",
    regNo: stored.regNo,
    department: stored.department,
    year: stored.year,
    section: stored.section,
    password: stored.password,
  };
}

export function getResults(studentId?: string): Result[] {
  const all = read<Result[]>(KEYS.results, []);
  return studentId ? all.filter((r) => r.studentId === studentId) : all;
}
export function addResult(r: Result) {
  write(KEYS.results, [r, ...getResults()]);
}

export function getViolations(): Violation[] {
  return read<Violation[]>(KEYS.violations, []);
}
export function addViolation(v: Violation) {
  write(KEYS.violations, [v, ...getViolations()].slice(0, 200));
}
export function clearViolations() {
  write(KEYS.violations, []);
}

export const NOTIFICATIONS = [
  { title: "Daily Python test opens at 4:00 PM", time: "Today", tone: "info" as const },
  { title: "Safe Exam Browser v3 is now mandatory", time: "Yesterday", tone: "warn" as const },
  { title: "Unit test 2 results published", time: "2 days ago", tone: "ok" as const },
];

export const VIOLATION_LIMIT = 5;

export const VIOLATION_TYPES: { type: string; penalty: number }[] = [
  { type: "Tab switch detected", penalty: 10 },
  { type: "Fullscreen exited", penalty: 10 },
  { type: "No face detected", penalty: 8 },
  { type: "Multiple faces detected", penalty: 15 },
  { type: "Mobile phone detected", penalty: 20 },
  { type: "Excessive head movement", penalty: 5 },
  { type: "Browser close attempt", penalty: 15 },
];

export function runPython(code: string, expected: string) {
  // Client-side simulated judge: heuristic static evaluation for the demo.
  const c = code.trim();
  if (!c || c.includes("# your code here") || c.includes("pass"))
    return { passed: false, output: "No output produced. Complete the implementation and run again." };
  if (!c.includes("print")) return { passed: false, output: "Your program produced no printed output." };
  return { passed: true, output: expected };
}
