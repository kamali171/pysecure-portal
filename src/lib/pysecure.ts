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
export type TestCase = { input: string; output: string };

export type Question = {
  id: string;
  topic: string;
  title: string;
  prompt: string;
  difficulty: Difficulty;
  hint: string;
  expectedOutput: string;
  testCases: TestCase[];
  starter: string;
  /* generated metadata */
  sampleInput?: string;
  sampleOutput?: string;
  hiddenTestCases?: TestCase[];
  constraints?: string[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
  inputFormat?: string;
  outputFormat?: string;
  formula?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
};

export type Test = {
  id: string;
  title: string;
  topics: string[];
  date: string;
  durationMin: number;
  questions: Question[];
  status?: "draft" | "published";
  version?: number;
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
  reevaluatedAt?: string;
};

export type Submission = {
  id: string;
  studentId: string;
  studentName: string;
  testId: string;
  questionId: string;
  code: string;
  passed: boolean;
  at: string;
};

export type MarkChange = {
  studentId: string;
  name: string;
  before: number;
  after: number;
  total: number;
};

export type EditHistoryEntry = {
  id: string;
  testId: string;
  facultyName: string;
  at: string;
  oldQuestion: string;
  newQuestion: string;
  oldHiddenTests: string;
  newHiddenTests: string;
  reason: string;
  reevaluatedStudents: number;
  version?: number;
  marksChanges?: MarkChange[];
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
  submissions: "pysecure.submissions",
  history: "pysecure.editHistory",
  draft: "pysecure.facultyDraft",
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
export function getPublishedTests(): Test[] {
  return getTests().filter((t) => t.status !== "draft");
}
export function activeTest(): Test {
  const all = getTests();
  return all.find((t) => t.status === "published") ?? all[0];
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

/* ---------------------- AI question generation (faculty) -------------------- */

export type QuestionBlueprint = {
  keys: string[];
  statement: string;
  inputFormat: string;
  outputFormat: string;
  samples: TestCase[];
  hidden: TestCase[];
  hint: string;
  formula?: string;
  time: string;
  space: string;
  difficulty: Difficulty;
  constraints: string[];
};

/** Question knowledge base — matched against the faculty title + topic. */
const BLUEPRINTS: QuestionBlueprint[] = [
  {
    keys: ["sum of first n", "first n natural", "natural numbers"],
    statement:
      "Read an integer N and print the sum of the first N natural numbers (1 + 2 + ... + N).",
    inputFormat: "A single line containing the integer N.",
    outputFormat: "A single line containing the sum.",
    samples: [{ input: "5", output: "15" }],
    hidden: [
      { input: "1", output: "1" },
      { input: "10", output: "55" },
      { input: "100", output: "5050" },
    ],
    hint: "Use the direct arithmetic-series formula instead of a loop.",
    formula: "n × (n + 1) / 2",
    time: "O(1)",
    space: "O(1)",
    difficulty: "Easy",
    constraints: ["1 ≤ N ≤ 10^6", "Output must match exactly (no extra spaces)"],
  },
  {
    keys: ["add two numbers", "sum of two numbers", "addition of two"],
    statement:
      "Read two integers A and B (one per line) and print their sum.",
    inputFormat: "Two lines, each containing one integer.",
    outputFormat: "A single line containing A + B.",
    samples: [{ input: "3\n4", output: "7" }],
    hidden: [
      { input: "0\n0", output: "0" },
      { input: "-5\n9", output: "4" },
      { input: "1000\n2500", output: "3500" },
    ],
    hint: "Use the + operator on the two integer inputs.",
    time: "O(1)",
    space: "O(1)",
    difficulty: "Easy",
    constraints: ["-10^9 ≤ A, B ≤ 10^9", "Output must match exactly (no extra spaces)"],
  },
  {
    keys: ["even"],
    statement:
      "Read an integer N and print all even numbers from 1 to N separated by a single space on one line.",
    inputFormat: "A single line containing the integer N.",
    outputFormat: "Space-separated even numbers on one line.",
    samples: [{ input: "10", output: "2 4 6 8 10" }],
    hidden: [
      { input: "1", output: "" },
      { input: "2", output: "2" },
      { input: "20", output: "2 4 6 8 10 12 14 16 18 20" },
    ],
    hint: "Loop with step 2 from 2, or test each number with n % 2 == 0.",
    formula: "count of evens = N // 2",
    time: "O(N)",
    space: "O(1)",
    difficulty: "Easy",
    constraints: ["1 ≤ N ≤ 10^4", "Output must match exactly (no extra spaces)"],
  },
  {
    keys: ["factorial"],
    statement:
      "Read an integer N and print N! (the factorial of N). Handle N = 0 correctly.",
    inputFormat: "A single line containing the integer N.",
    outputFormat: "A single line containing N!.",
    samples: [{ input: "5", output: "120" }],
    hidden: [
      { input: "0", output: "1" },
      { input: "1", output: "1" },
      { input: "10", output: "3628800" },
    ],
    hint: "Define the base case factorial(0) = 1, then multiply n by factorial(n - 1).",
    formula: "n! = n × (n − 1)!",
    time: "O(N)",
    space: "O(N) for the recursion stack",
    difficulty: "Medium",
    constraints: ["0 ≤ N ≤ 20", "Use recursion", "Output must match exactly"],
  },
  {
    keys: ["fibonacci"],
    statement:
      "Read an integer N and print the Nth Fibonacci number, where F(0) = 0 and F(1) = 1.",
    inputFormat: "A single line containing the integer N.",
    outputFormat: "A single line containing F(N).",
    samples: [{ input: "7", output: "13" }],
    hidden: [
      { input: "0", output: "0" },
      { input: "1", output: "1" },
      { input: "20", output: "6765" },
    ],
    hint: "Keep two running values and shift them forward on each iteration.",
    formula: "F(n) = F(n − 1) + F(n − 2)",
    time: "O(N)",
    space: "O(1)",
    difficulty: "Medium",
    constraints: ["0 ≤ N ≤ 40", "Output must match exactly"],
  },
  {
    keys: ["palindrome"],
    statement:
      "Read a string and print True if it is a palindrome, otherwise print False.",
    inputFormat: "A single line containing the string S.",
    outputFormat: "True or False.",
    samples: [{ input: "madam", output: "True" }],
    hidden: [
      { input: "a", output: "True" },
      { input: "abba", output: "True" },
      { input: "python", output: "False" },
    ],
    hint: "Compare the string with its reverse — s == s[::-1].",
    time: "O(|S|)",
    space: "O(|S|)",
    difficulty: "Easy",
    constraints: ["1 ≤ |S| ≤ 10^4", "S contains printable ASCII only"],
  },
  {
    keys: ["reverse"],
    statement:
      "Read a string and print it reversed without using any built-in reverse function.",
    inputFormat: "A single line containing the string S.",
    outputFormat: "The reversed string on one line.",
    samples: [{ input: "python", output: "nohtyp" }],
    hidden: [
      { input: "a", output: "a" },
      { input: "level", output: "level" },
      { input: "assessment", output: "tnemssessa" },
    ],
    hint: "Iterate from the last index down to 0 and append each character to a list, then ''.join() it.",
    time: "O(|S|)",
    space: "O(|S|)",
    difficulty: "Easy",
    constraints: ["1 ≤ |S| ≤ 10^4", "No built-in reversed()/[::-1]"],
  },
  {
    keys: ["prime"],
    statement:
      "Read an integer N and print True if N is a prime number, otherwise print False.",
    inputFormat: "A single line containing the integer N.",
    outputFormat: "True or False.",
    samples: [{ input: "7", output: "True" }],
    hidden: [
      { input: "1", output: "False" },
      { input: "2", output: "True" },
      { input: "9", output: "False" },
    ],
    hint: "Only test divisors up to the square root of N.",
    formula: "check i from 2 to √n",
    time: "O(√N)",
    space: "O(1)",
    difficulty: "Medium",
    constraints: ["1 ≤ N ≤ 10^9", "Output must be exactly True or False"],
  },
  {
    keys: ["largest", "maximum", "max element"],
    statement:
      "Read a space-separated list of integers and print the largest value.",
    inputFormat: "A single line of space-separated integers.",
    outputFormat: "A single line containing the maximum value.",
    samples: [{ input: "3 9 2 7", output: "9" }],
    hidden: [
      { input: "5", output: "5" },
      { input: "-4 -9 -1", output: "-1" },
      { input: "10 10 2", output: "10" },
    ],
    hint: "Track a running maximum while scanning the list once.",
    time: "O(n)",
    space: "O(1)",
    difficulty: "Easy",
    constraints: ["1 ≤ len(arr) ≤ 10^5", "-10^9 ≤ arr[i] ≤ 10^9"],
  },
  {
    keys: ["sum of digits", "digit sum", "digits"],
    statement: "Read an integer and print the sum of its digits.",
    inputFormat: "A single line containing the integer N.",
    outputFormat: "A single line containing the digit sum.",
    samples: [{ input: "12345", output: "15" }],
    hidden: [
      { input: "0", output: "0" },
      { input: "9", output: "9" },
      { input: "1001", output: "2" },
    ],
    hint: "Repeatedly take n % 10 and then n //= 10, or sum over str(n).",
    formula: "sum(int(d) for d in str(n))",
    time: "O(log N)",
    space: "O(1)",
    difficulty: "Easy",
    constraints: ["0 ≤ N ≤ 10^18", "Output must match exactly"],
  },
  {
    keys: ["frequency", "count character", "occurrence"],
    statement:
      "Read a word and print each unique character with its frequency, one pair per line in first-seen order.",
    inputFormat: "A single line containing the word S.",
    outputFormat: "One 'character count' pair per line.",
    samples: [{ input: "aab", output: "a 2\nb 1" }],
    hidden: [
      { input: "a", output: "a 1" },
      { input: "xyz", output: "x 1\ny 1\nz 1" },
      { input: "aaa", output: "a 3" },
    ],
    hint: "Use a dictionary counter — d[c] = d.get(c, 0) + 1 avoids KeyError.",
    time: "O(|S|)",
    space: "O(k) unique characters",
    difficulty: "Medium",
    constraints: ["1 ≤ |S| ≤ 10^4", "Preserve first-seen order"],
  },
];

function matchBlueprint(title: string, prompt: string): QuestionBlueprint | null {
  const hay = `${title} ${prompt}`.toLowerCase();
  return (
    BLUEPRINTS.find((b) => b.keys.some((k) => hay.includes(k))) ?? null
  );
}

export function generateConstraints(prompt: string, title = ""): string[] {
  const bp = matchBlueprint(title, prompt);
  if (bp) return bp.constraints;
  const p = `${title} ${prompt}`.toLowerCase();
  const base = ["1 ≤ N ≤ 10^5", "Input is always valid", "Output must match exactly (no extra spaces)"];
  if (p.includes("string") || p.includes("word")) return ["1 ≤ |S| ≤ 10^4", "S contains printable ASCII only", base[2]];
  if (p.includes("list") || p.includes("array")) return ["1 ≤ len(arr) ≤ 10^5", "-10^9 ≤ arr[i] ≤ 10^9", base[2]];
  if (p.includes("recursion")) return ["0 ≤ N ≤ 20", "Use recursion, no loops", base[2]];
  return base;
}

export function generateHiddenTestCases(prompt: string, title = ""): TestCase[] {
  const bp = matchBlueprint(title, prompt);
  if (bp) return bp.hidden;
  const visible = generateTestCases(prompt);
  return [
    ...visible.map((t) => ({ input: t.input, output: t.output })),
    { input: "1", output: "1" },
  ];
}

/** Generates the problem statement from just the title + topic. */
export function generateStatement(topic: string, title: string): string {
  const bp = matchBlueprint(title, "");
  if (bp) return bp.statement;
  return `${title.trim()} — using ${topic}, read the required input from standard input, apply the ${topic.toLowerCase()} logic described by the title, and print only the final result. Do not print any extra prompts or labels.`;
}

/** Builds the full question object from the faculty-entered fields. */
export function generateQuestion(
  topic: string,
  title: string,
  prompt: string,
  overrides: Partial<Question> = {},
): Question {
  const statement = (prompt.trim() || generateStatement(topic, title)).slice(0, 2000);
  const bp = matchBlueprint(title, statement);
  const visible = bp ? bp.samples : generateTestCases(statement);
  const difficulty = bp ? bp.difficulty : inferDifficulty(statement);
  return {
    id: uid(),
    topic,
    title: title.trim().slice(0, 120),
    prompt: statement,
    difficulty,
    hint: bp
      ? bp.formula
        ? `${bp.hint}\nFormula: ${bp.formula}`
        : bp.hint
      : generateHint(topic, statement),
    expectedOutput: visible[0].output,
    testCases: visible,
    sampleInput: visible[0].input,
    sampleOutput: visible[0].output,
    hiddenTestCases: generateHiddenTestCases(statement, title),
    constraints: generateConstraints(statement, title),
    inputFormat: bp?.inputFormat ?? "Read the input values from standard input, one per line.",
    outputFormat: bp?.outputFormat ?? "Print only the final result on a single line.",
    formula: bp?.formula,
    timeComplexity: bp?.time ?? (difficulty === "Hard" ? "O(n log n)" : "O(n)"),
    spaceComplexity: bp?.space ?? "O(1)",
    timeLimitMs: difficulty === "Hard" ? 3000 : difficulty === "Medium" ? 2000 : 1000,
    memoryLimitMb: difficulty === "Hard" ? 256 : 128,
    starter: "# Write your Python solution here\n",
    ...overrides,
  };
}

/** Re-runs generation for the evaluation fields while keeping faculty text. */
export function regenerateQuestion(q: Question): Question {
  return generateQuestion(q.topic, q.title, q.prompt, { id: q.id, starter: q.starter });
}

/** Publishing gate — every question must be complete. */
export function validateTestForPublish(test: Test): string[] {
  const errors: string[] = [];
  if (!test.title.trim()) errors.push("Test title is required");
  if (test.questions.length === 0) errors.push("Add at least one question");
  test.questions.forEach((q, i) => {
    const n = `Q${i + 1}`;
    if (!q.title.trim()) errors.push(`${n}: title missing`);
    if (!q.prompt.trim()) errors.push(`${n}: problem statement missing`);
    if (!q.topic) errors.push(`${n}: topic missing`);
    if (!q.sampleInput && q.sampleInput !== "") errors.push(`${n}: sample input missing`);
    if (!q.sampleOutput) errors.push(`${n}: sample output missing`);
    if (!q.expectedOutput) errors.push(`${n}: expected output missing`);
    if (!q.hiddenTestCases || q.hiddenTestCases.length === 0)
      errors.push(`${n}: hidden test cases missing`);
    if (!q.hint?.trim()) errors.push(`${n}: hint missing`);
    if (!q.timeLimitMs) errors.push(`${n}: time limit missing`);
    if (!q.memoryLimitMb) errors.push(`${n}: memory limit missing`);
  });
  return errors;
}


/* ------------------------ tests: drafts + publishing ----------------------- */

export function updateTest(test: Test) {
  const all = getTests();
  const idx = all.findIndex((t) => t.id === test.id);
  if (idx === -1) write(KEYS.tests, [test, ...all]);
  else {
    all[idx] = test;
    write(KEYS.tests, all);
  }
}

export function saveDraft(test: Test) {
  write(KEYS.draft, { ...test, status: "draft" });
}
export function getDraft(): Test | null {
  return read<Test | null>(KEYS.draft, null);
}
export function clearDraft() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEYS.draft);
}

/* ------------------------------- submissions ------------------------------- */

export function getSubmissions(testId?: string): Submission[] {
  const all = read<Submission[]>(KEYS.submissions, []);
  return testId ? all.filter((s) => s.testId === testId) : all;
}
export function saveSubmission(s: Submission) {
  // Submissions are append-only — history is never deleted.
  write(KEYS.submissions, [s, ...getSubmissions()]);
}

/* ------------------------------ edit history ------------------------------- */

export function getEditHistory(testId?: string): EditHistoryEntry[] {
  const all = read<EditHistoryEntry[]>(KEYS.history, []);
  return testId ? all.filter((h) => h.testId === testId) : all;
}
export function addEditHistory(e: EditHistoryEntry) {
  write(KEYS.history, [e, ...getEditHistory()]);
}

/* ------------------------------ re-evaluation ------------------------------ */

/**
 * Re-judges every stored submission of a test against the updated question set
 * and lifts marks / results / leaderboard when old code now passes.
 * Submissions themselves are never mutated or deleted — a new judged copy is
 * appended so the original attempt stays in the audit trail.
 */
export function reevaluateTest(
  test: Test,
): { students: number; upgraded: number; changes: MarkChange[] } {
  const subs = getSubmissions(test.id);
  const byStudent = new Map<string, Submission[]>();
  for (const s of subs) {
    // keep only the latest submission per question per student for scoring
    const list = byStudent.get(s.studentId) ?? [];
    if (!list.some((x) => x.questionId === s.questionId)) list.push(s);
    byStudent.set(s.studentId, list);
  }

  const results = getResults();
  const students = getStudents();
  const changes: MarkChange[] = [];
  let upgraded = 0;

  for (const [studentId, list] of byStudent) {
    let score = 0;
    for (const sub of list) {
      const q = test.questions.find((x) => x.id === sub.questionId);
      if (!q) continue;
      const cases = [...(q.hiddenTestCases ?? []), ...q.testCases];
      const verdict = cases.every((c) => runPython(sub.code, c.output).passed);
      if (verdict) score += 1;
      if (verdict && !sub.passed) {
        upgraded += 1;
        saveSubmission({ ...sub, id: uid(), passed: true, at: new Date().toISOString() });
      }
    }
    const idx = results.findIndex((r) => r.studentId === studentId && r.testId === test.id);
    if (idx !== -1 && score > results[idx].score) {
      const stu = students.find((x) => x.id === studentId);
      changes.push({
        studentId,
        name: stu ? `${stu.firstName} ${stu.lastName}` : list[0]?.studentName ?? "Student",
        before: results[idx].score,
        after: score,
        total: test.questions.length,
      });
      results[idx] = {
        ...results[idx],
        score,
        total: test.questions.length,
        reevaluatedAt: new Date().toISOString(),
      };
    }
  }

  write(KEYS.results, results);
  return { students: byStudent.size, upgraded, changes };
}


/** Leaderboard derived from results — always reflects re-evaluated marks. */
export function getLeaderboard(testId: string) {
  const students = getStudents();
  return getResults()
    .filter((r) => r.testId === testId)
    .map((r) => {
      const s = students.find((x) => x.id === r.studentId);
      return {
        studentId: r.studentId,
        name: s ? `${s.firstName} ${s.lastName}` : "Student",
        regNo: s?.regNo ?? "—",
        score: r.score,
        total: r.total,
        trustScore: r.trustScore,
        reevaluatedAt: r.reevaluatedAt,
      };
    })
    .sort((a, b) => b.score - a.score || b.trustScore - a.trustScore);
}
