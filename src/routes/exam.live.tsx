import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  activeTest,
  addResult,
  addViolation,
  getSession,
  runPython,
  uid,
  VIOLATION_LIMIT,
  VIOLATION_TYPES,
  type Question,
  type AuthSession,
  type Test,
} from "@/lib/pysecure";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Play,
  Send,
  ShieldCheck,
  Timer,
} from "lucide-react";

export const Route = createFileRoute("/exam/live")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Secure Exam Interface — PySecure" },
      {
        name: "description",
        content:
          "Proctored Python coding exam with timer, question palette, trust score and live webcam monitoring.",
      },
      { property: "og:title", content: "Secure Exam Interface — PySecure" },
      { property: "og:description", content: "Write, run and submit Python under AI proctoring." },
    ],
  }),
  component: ExamLive,
});

const DIFF_STYLE: Record<string, string> = {
  Easy: "bg-success/15 text-success border-success/30",
  Medium: "bg-warning/20 text-warning border-warning/40",
  Hard: "bg-destructive/15 text-destructive border-destructive/30",
};

function ExamLive() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const submitted = useRef(false);

  const [student, setStudent] = useState<AuthSession | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [idx, setIdx] = useState(0);
  const [code, setCode] = useState<Record<string, string>>({});
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  const [output, setOutput] = useState("Run your code to see the output console.");
  const [hintOpen, setHintOpen] = useState(false);
  const [seconds, setSeconds] = useState(60 * 60);
  const [violations, setViolations] = useState<{ type: string; at: string }[]>([]);
  const [trust, setTrust] = useState(100);

  const question: Question | undefined = test?.questions[idx];

  /* ---------------------------- setup / teardown --------------------------- */
  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.navigate({ to: "/" });
      return;
    }
    const t = activeTest();
    setStudent(s);
    setTest(t);
    setCode(Object.fromEntries(t.questions.map((q) => [q.id, q.starter])));

    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => toast.error("Webcam unavailable — proctoring cannot verify your identity."));

    document.documentElement.requestFullscreen?.().catch(() => undefined);

    return () => streamRef.current?.getTracks().forEach((tr) => tr.stop());
  }, [router]);

  /* -------------------------------- timer --------------------------------- */
  useEffect(() => {
    const i = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(i);
  }, []);

  const finish = useCallback(
    (auto: boolean) => {
      if (submitted.current || !student || !test) return;
      submitted.current = true;
      const score = Object.values(solved).filter(Boolean).length;
      addResult({
        id: uid(),
        studentId: student.id,
        testId: test.id,
        testTitle: test.title,
        score,
        total: test.questions.length,
        trustScore: trust,
        violations: violations.length,
        date: new Date().toISOString(),
      });
      document.exitFullscreen?.().catch(() => undefined);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      toast[auto ? "error" : "success"](
        auto ? "Auto-submitted due to repeated violations" : "Exam submitted successfully",
        { description: `Score ${score}/${test.questions.length} · Trust ${trust}%` },
      );
      router.navigate({ to: "/results" });
    },
    [router, solved, student, test, trust, violations.length],
  );

  useEffect(() => {
    if (seconds === 0) finish(true);
  }, [seconds, finish]);

  /* ----------------------------- AI proctoring ---------------------------- */
  const flag = useCallback(
    (type: string, penalty: number) => {
      if (submitted.current) return;
      const at = new Date().toISOString();
      setViolations((v) => {
        const next = [{ type, at }, ...v];
        if (next.length >= VIOLATION_LIMIT) setTimeout(() => finish(true), 400);
        return next;
      });
      setTrust((t) => Math.max(0, t - penalty));
      const s = getSession();
      addViolation({
        id: uid(),
        studentId: s?.id ?? "unknown",
        studentName: s ? `${s.firstName} ${s.lastName}` : "Unknown",
        type,
        penalty,
        at,
      });
      toast.warning(type, { description: `Trust score reduced by ${penalty} points.` });
    },
    [finish],
  );

  useEffect(() => {
    const onVis = () => document.hidden && flag("Tab switch detected", 10);
    const onFs = () => !document.fullscreenElement && flag("Fullscreen exited", 10);
    const onBlur = () => flag("Window focus lost", 6);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      flag("Browser close attempt", 15);
      e.preventDefault();
      e.returnValue = "";
    };
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("blur", onBlur);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [flag]);

  // Simulated vision model sampling the webcam feed.
  useEffect(() => {
    const i = setInterval(() => {
      if (Math.random() < 0.12) {
        const v = VIOLATION_TYPES[Math.floor(Math.random() * 5) + 2];
        flag(v.type, v.penalty);
      }
    }, 20000);
    return () => clearInterval(i);
  }, [flag]);

  const mmss = useMemo(() => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  }, [seconds]);

  if (!test || !question) return null;

  const run = () => {
    const res = runPython(code[question.id] ?? "", question.expectedOutput);
    setOutput(
      res.passed
        ? `$ python solution.py\n${res.output}\n\n✔ All ${question.testCases.length} sample test cases passed.`
        : `$ python solution.py\n${res.output}`,
    );
    setSolved((s) => ({ ...s, [question.id]: res.passed }));
    res.passed ? toast.success("Sample test cases passed") : toast.error("Test cases failed");
  };

  return (
    <div className="min-h-screen">
      {/* top bar */}
      <div className="sticky top-0 z-40 glass-dark">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5" />
            <div>
              <p className="text-sm font-bold">{test.title}</p>
              <p className="text-[11px] opacity-70">
                Question {idx + 1} of {test.questions.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5">
              <Timer className="size-4" />
              <span className="font-mono text-lg font-semibold tabular-nums">{mmss}</span>
            </div>
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 ${violations.length ? "bg-destructive/30 alert-pulse" : "bg-white/10"}`}
            >
              <AlertTriangle className="size-4" />
              <span className="text-sm font-semibold">
                {violations.length}/{VIOLATION_LIMIT}
              </span>
            </div>
            <Button size="sm" variant="secondary" className="gap-2" onClick={() => finish(false)}>
              <Send className="size-4" /> Submit
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-4 p-4 xl:grid-cols-[260px_1fr_320px]">
        {/* palette */}
        <aside className="glass h-fit rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-semibold">Question Palette</h3>
          <div className="grid grid-cols-5 gap-2">
            {test.questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => {
                  setIdx(i);
                  setHintOpen(false);
                }}
                className={`grid aspect-square place-items-center rounded-lg text-sm font-semibold transition-all ${
                  i === idx
                    ? "brand-gradient text-primary-foreground"
                    : solved[q.id]
                      ? "bg-success/20 text-success"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-5 space-y-2 text-xs text-muted-foreground">
            <p>
              <span className="mr-2 inline-block size-3 rounded bg-success/40 align-middle" />
              Solved
            </p>
            <p>
              <span className="mr-2 inline-block size-3 rounded bg-secondary align-middle" />
              Not attempted
            </p>
          </div>
          <div className="mt-5 rounded-xl bg-secondary/70 p-3">
            <p className="text-xs font-medium text-muted-foreground">Trust Score</p>
            <p
              className={`font-display text-3xl font-bold ${trust > 70 ? "text-success" : trust > 40 ? "text-warning" : "text-destructive"}`}
            >
              {trust}%
            </p>
            <Progress value={trust} className="mt-2" />
          </div>
        </aside>

        {/* main */}
        <main className="space-y-4">
          <section className="glass rounded-2xl p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold">{question.title}</h2>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${DIFF_STYLE[question.difficulty]}`}
              >
                {question.difficulty}
              </span>
              <Badge variant="secondary">{question.topic}</Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{question.prompt}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {question.testCases.map((tc, i) => (
                <div key={i} className="rounded-xl border border-border/70 bg-card/60 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Sample {i + 1}</p>
                  <pre className="mt-1 font-mono text-xs">
                    input: {tc.input}
                    {"\n"}output: {tc.output}
                  </pre>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2"
              onClick={() => setHintOpen((h) => !h)}
            >
              <Lightbulb className="size-4" /> {hintOpen ? "Hide hint" : "AI Hint"}
            </Button>
            {hintOpen && (
              <p className="mt-3 rounded-xl border border-primary/25 bg-primary/8 p-3 text-sm">
                💡 {question.hint}
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-foreground/95">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <span className="font-mono text-xs text-background/70">solution.py — Python 3.11</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="h-8 gap-1.5" onClick={run}>
                  <Play className="size-3.5" /> Run Code
                </Button>
              </div>
            </div>
            <textarea
              spellCheck={false}
              value={code[question.id] ?? ""}
              onChange={(e) => setCode((c) => ({ ...c, [question.id]: e.target.value }))}
              className="h-72 w-full resize-none bg-transparent px-4 py-3 font-mono text-sm text-background outline-none"
            />
            <div className="border-t border-white/10 bg-black/25 px-4 py-3">
              <pre className="font-mono text-xs whitespace-pre-wrap text-background/85">
                {output}
              </pre>
            </div>
          </section>

          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              className="gap-2"
              disabled={idx === 0}
              onClick={() => setIdx((i) => i - 1)}
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <Button
              className="gap-2"
              disabled={idx === test.questions.length - 1}
              onClick={() => setIdx((i) => i + 1)}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </main>

        {/* proctor rail */}
        <aside className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-semibold">Webcam Monitoring</h3>
            <div className="overflow-hidden rounded-xl bg-foreground/90">
              <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-success">
              <span className="size-2 animate-pulse rounded-full bg-success" /> Recording · face
              tracking active
            </p>
          </div>

          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-semibold">Violation Log</h3>
            {violations.length === 0 ? (
              <p className="text-xs text-muted-foreground">No violations recorded. Keep it up.</p>
            ) : (
              <ul className="space-y-2">
                {violations.slice(0, 6).map((v, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-destructive/25 bg-destructive/8 p-2.5"
                  >
                    <p className="text-xs font-semibold text-destructive">{v.type}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(v.at).toLocaleTimeString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">
              Auto-submission triggers at {VIOLATION_LIMIT} violations.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
