import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addEditHistory,
  clearDraft,
  generateQuestion,
  generateStatement,
  getDraft,
  getEditHistory,
  getSession,
  getTests,
  reevaluateTest,
  regenerateQuestion,
  saveDraft,
  saveTest,
  TOPICS,
  uid,
  updateTest,
  validateTestForPublish,
  type Difficulty,
  type EditHistoryEntry,
  type Question,
  type Test,
  type TestCase,
} from "@/lib/pysecure";

import {
  Sparkles,
  Plus,
  Trash2,
  BookOpen,
  Copy,
  Pencil,
  GripVertical,
  Eye,
  Save,
  History,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/faculty")({
  ssr: false,
  beforeLoad: () => {
    const session = getSession();
    if (!session || session.role !== "faculty") {
      throw redirect({ to: "/faculty/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Faculty Panel — Question Management | PySecure" },
      {
        name: "description",
        content:
          "Faculty question management system: build 10+ Python questions per test with auto-generated hints, hidden test cases, constraints and limits.",
      },
      { property: "og:title", content: "Faculty Panel — PySecure" },
      { property: "og:description", content: "Create AI-assisted Python assessments in minutes." },
    ],
  }),
  component: Faculty,
});

const MIN_QUESTIONS = 10;

function summarizeCases(cases: { input: string; output: string }[] | undefined) {
  return (cases ?? []).map((c) => `${c.input || "∅"} → ${c.output || "∅"}`).join(" | ");
}

function Faculty() {
  const router = useRouter();
  const [topics, setTopics] = useState<string[]>([]);
  const [title, setTitle] = useState("Daily Python Assessment");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [history, setHistory] = useState<EditHistoryEntry[]>([]);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [qTitle, setQTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [qTopic, setQTopic] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "faculty") {
      router.navigate({ to: "/faculty/login" });
      return;
    }
    setTests(getTests());
  }, [router]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [reason, setReason] = useState("");

  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    setTests(getTests());
    setHistory(getEditHistory());
    const d = getDraft();
    if (d) {
      setTitle(d.title);
      setTopics(d.topics);
      setQuestions(d.questions);
      toast.info("Restored your saved draft");
    }
  }, []);

  const publishedTest = useMemo(
    () => tests.find((t) => t.id === editingTestId) ?? null,
    [tests, editingTestId],
  );

  const toggle = (t: string) =>
    setTopics((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  /* ------------------------------ question CRUD ----------------------------- */

  function openBuilder(q?: Question) {
    if (q) {
      setEditId(q.id);
      setQTitle(q.title);
      setPrompt(q.prompt);
      setQTopic(q.topic);
    } else {
      setEditId(null);
      setQTitle("");
      setPrompt("");
      setQTopic(topics[0] ?? "");
    }
    setBuilderOpen(true);
  }

  function saveQuestion() {
    if (!qTitle.trim() || !prompt.trim()) return toast.error("Question title and problem statement required");
    const topic = qTopic || topics[0];
    if (!topic) return toast.error("Select a syllabus topic first");
    if (!topics.includes(topic)) setTopics((s) => [...s, topic]);

    if (editId) {
      const existing = questions.find((x) => x.id === editId)!;
      const updated = generateQuestion(topic, qTitle, prompt, { id: editId, starter: existing.starter });
      setQuestions((qs) => qs.map((x) => (x.id === editId ? updated : x)));
      toast.success("Question updated & regenerated", { description: `${updated.difficulty} · ${topic}` });
    } else {
      const q = generateQuestion(topic, qTitle, prompt);
      setQuestions((qs) => [...qs, q]);
      toast.success("AI generated hint, cases, constraints & limits", {
        description: `${q.difficulty} · ${topic}`,
      });
    }
    setBuilderOpen(false);
  }

  const removeQuestion = (id: string) => setQuestions((qs) => qs.filter((x) => x.id !== id));

  const duplicateQuestion = (id: string) =>
    setQuestions((qs) => {
      const i = qs.findIndex((x) => x.id === id);
      if (i === -1) return qs;
      const copy: Question = { ...qs[i], id: uid(), title: `${qs[i].title} (copy)` };
      return [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)];
    });

  const regenerate = (id: string) =>
    setQuestions((qs) => {
      const next = qs.map((x) => (x.id === id ? regenerateQuestion(x) : x));
      toast.success("Regenerated AI fields for this question");
      return next;
    });

  /* ------------------------------ drag & drop ------------------------------- */

  function onDrop(target: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    setOverIndex(null);
    if (from === null || from === target) return;
    setQuestions((qs) => {
      const next = [...qs];
      const [moved] = next.splice(from, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }

  /* --------------------------- draft / publish flow ------------------------- */

  function handleSaveDraft() {
    if (questions.length === 0) return toast.error("Add at least one question");
    saveDraft({
      id: editingTestId ?? "draft",
      title: title.trim() || "Daily Python Assessment",
      topics,
      date: new Date().toISOString(),
      durationMin: 60,
      questions,
      status: "draft",
    });
    toast.success("Draft saved", { description: `${questions.length} questions stored locally` });
  }

  function startPublish() {
    if (questions.length < MIN_QUESTIONS)
      return toast.error(`A test needs at least ${MIN_QUESTIONS} questions`, {
        description: `${questions.length}/${MIN_QUESTIONS} added so far`,
      });
    setReason("");
    setPublishOpen(true);
  }

  function confirmPublish() {
    const session = getSession();
    const facultyName = session ? `${session.firstName} ${session.lastName}` : "Faculty";

    if (publishedTest) {
      const before = publishedTest;
      const updated: Test = { ...before, title: title.trim() || before.title, topics, questions, status: "published" };
      updateTest(updated);
      const { students, upgraded } = reevaluateTest(updated);
      addEditHistory({
        id: uid(),
        testId: updated.id,
        facultyName,
        at: new Date().toISOString(),
        oldQuestion: before.questions.map((q) => q.title).join(", "),
        newQuestion: questions.map((q) => q.title).join(", "),
        oldHiddenTests: before.questions.map((q) => summarizeCases(q.hiddenTestCases)).join(" ‖ "),
        newHiddenTests: questions.map((q) => summarizeCases(q.hiddenTestCases)).join(" ‖ "),
        reason: reason.trim() || "Question / test-case correction",
        reevaluatedStudents: students,
      });
      setTests(getTests());
      setHistory(getEditHistory());
      toast.success("Published test updated", {
        description: `${students} student submissions re-evaluated · ${upgraded} answers upgraded`,
      });
    } else {
      const test: Test = {
        id: uid(),
        title: title.trim() || "Daily Python Assessment",
        topics,
        date: new Date().toISOString(),
        durationMin: 60,
        questions,
        status: "published",
      };
      saveTest(test);
      setTests(getTests());
      setEditingTestId(test.id);
      toast.success("Test published to all students");
    }
    clearDraft();
    setPublishOpen(false);
  }

  function loadForEditing(t: Test) {
    setEditingTestId(t.id);
    setTitle(t.title);
    setTopics(t.topics);
    setQuestions(t.questions.map((q) => (q.hiddenTestCases ? q : regenerateQuestion(q))));
    toast.info(`Editing published test — ${t.title}`);
  }

  function newTest() {
    setEditingTestId(null);
    setTitle("Daily Python Assessment");
    setTopics([]);
    setQuestions([]);
    clearDraft();
  }

  /* ---------------------------------- view ---------------------------------- */

  return (
    <AppShell>
      <PageTitle
        title="Faculty Panel"
        subtitle="Build today's one-hour Python test. Enter only title, problem statement and topic — difficulty, samples, hidden cases, constraints, limits and hints are generated automatically."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="glass rise space-y-6 rounded-3xl p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-[240px] flex-1 space-y-2">
              <Label htmlFor="title">Test Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="h-9 px-3 text-sm">
                Total questions: {questions.length}
                <span className="ml-1 text-muted-foreground">/ {MIN_QUESTIONS} min</span>
              </Badge>
              {publishedTest && (
                <Badge className="h-9 px-3 text-sm">Editing published</Badge>
              )}
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Syllabus Topics</Label>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle(t)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    topics.includes(t)
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border bg-card/60 hover:bg-accent"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => openBuilder()} className="gap-2">
              <Plus className="size-4" /> Add Question
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} className="gap-2">
              <Save className="size-4" /> Save Draft
            </Button>
            <Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2">
              <Eye className="size-4" /> Preview Test
            </Button>
            <Button onClick={startPublish} className="gap-2 font-semibold">
              <Sparkles className="size-4" /> {publishedTest ? "Update Published Test" : "Publish Test"}
            </Button>
            {(publishedTest || questions.length > 0) && (
              <Button variant="ghost" onClick={newTest}>
                New test
              </Button>
            )}
          </div>

          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
              <Sparkles className="mx-auto mb-3 size-6 text-primary" />
              <p className="font-semibold">No questions yet</p>
              <p className="text-sm text-muted-foreground">
                Click “Add Question” and enter a title, statement and topic — everything else is generated.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <article
                  key={q.id}
                  draggable
                  onDragStart={() => (dragIndex.current = i)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverIndex(i);
                  }}
                  onDragEnd={() => setOverIndex(null)}
                  onDrop={() => onDrop(i)}
                  className={`rounded-2xl border bg-card/60 p-4 transition-shadow ${
                    overIndex === i ? "border-primary shadow-lg" : "border-border/70"
                  }`}
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 cursor-grab text-muted-foreground" aria-label="Drag to reorder">
                        <GripVertical className="size-4" />
                      </span>
                      <div>
                        <p className="font-semibold">
                          Q{i + 1}. {q.title}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          <Badge variant="secondary">{q.topic}</Badge>
                          <Badge>{q.difficulty}</Badge>
                          <Badge variant="outline">{q.timeLimitMs} ms</Badge>
                          <Badge variant="outline">{q.memoryLimitMb} MB</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => regenerate(q.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Regenerate AI fields"
                        title="Regenerate AI fields"
                      >
                        <RefreshCw className="size-4" />
                      </button>
                      <button
                        onClick={() => openBuilder(q)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Edit question"
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => duplicateQuestion(q.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Duplicate question"
                        title="Duplicate"
                      >
                        <Copy className="size-4" />
                      </button>
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete question"
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </header>

                  <p className="mt-3 text-sm text-muted-foreground">{q.prompt}</p>

                  <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                      <dt className="mb-1 font-semibold">Sample Input</dt>
                      <dd className="font-mono text-muted-foreground">{q.sampleInput || "—"}</dd>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                      <dt className="mb-1 font-semibold">Sample Output</dt>
                      <dd className="font-mono text-muted-foreground">{q.sampleOutput || "—"}</dd>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                      <dt className="mb-1 font-semibold">Expected Output</dt>
                      <dd className="font-mono text-muted-foreground">{q.expectedOutput}</dd>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                      <dt className="mb-1 font-semibold">
                        Hidden Test Cases ({q.hiddenTestCases?.length ?? 0})
                      </dt>
                      <dd className="font-mono text-muted-foreground">
                        {summarizeCases(q.hiddenTestCases) || "—"}
                      </dd>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/50 p-3 sm:col-span-2">
                      <dt className="mb-1 font-semibold">Constraints</dt>
                      <dd className="text-muted-foreground">{(q.constraints ?? []).join(" · ")}</dd>
                    </div>
                  </dl>

                  <p className="mt-3 text-xs text-muted-foreground">💡 {q.hint}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="glass rise h-fit rounded-3xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              <h3 className="font-semibold">Published Tests</h3>
            </div>
            <ul className="space-y-3">
              {tests.map((t) => (
                <li key={t.id} className="rounded-xl border border-border/70 bg-card/60 p-3">
                  <p className="text-sm font-semibold">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.questions.length} questions · {t.durationMin} min ·{" "}
                    {new Date(t.date).toLocaleDateString()}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 gap-1.5 text-xs"
                    onClick={() => loadForEditing(t)}
                  >
                    <Pencil className="size-3" /> Edit test
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rise h-fit rounded-3xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <History className="size-4 text-primary" />
              <h3 className="font-semibold">Edit History</h3>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Edits to published tests are logged here with re-evaluation counts.
              </p>
            ) : (
              <ul className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="rounded-xl border border-border/70 bg-card/60 p-3 text-xs">
                    <p className="font-semibold">{h.facultyName}</p>
                    <p className="text-muted-foreground">{new Date(h.at).toLocaleString()}</p>
                    <p className="mt-1.5">
                      <span className="text-muted-foreground">Reason:</span> {h.reason}
                    </p>
                    <p className="mt-1 line-clamp-2 text-muted-foreground">
                      Old: {h.oldQuestion || "—"}
                    </p>
                    <p className="line-clamp-2 text-muted-foreground">New: {h.newQuestion || "—"}</p>
                    <p className="mt-1 line-clamp-2 text-muted-foreground">
                      Hidden cases: {h.oldHiddenTests ? "changed" : "—"} → {h.newHiddenTests ? "updated" : "—"}
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      {h.reevaluatedStudents} students re-evaluated
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* ------------------------------ builder ------------------------------ */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Question" : "Add Question"}</DialogTitle>
            <DialogDescription>
              Enter the title, problem statement and topic. Difficulty, samples, hidden test cases,
              expected output, constraints, limits and the hint are generated for you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qt">Question Title</Label>
              <Input
                id="qt"
                value={qTitle}
                onChange={(e) => setQTitle(e.target.value)}
                placeholder="Find the largest element in a list"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qp">Problem Statement</Label>
              <Textarea
                id="qp"
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the task, input format and output format..."
                maxLength={2000}
              />
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQTopic(t)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      qTopic === t
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border bg-card/60 hover:bg-accent"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuilderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveQuestion} className="gap-2">
              <Sparkles className="size-4" /> {editId ? "Save & Regenerate" : "Generate & Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------ preview ----------------------------- */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title} — Student Preview</DialogTitle>
            <DialogDescription>
              {questions.length} questions · 60 minutes · topics: {topics.join(", ") || "—"}
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-4">
            {questions.map((q, i) => (
              <li key={q.id} className="rounded-2xl border border-border/70 bg-card/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">
                    Q{i + 1}. {q.title}
                  </p>
                  <Badge>{q.difficulty}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{q.prompt}</p>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <pre className="overflow-x-auto rounded-lg bg-background/60 p-2 font-mono">
                    Input{"\n"}
                    {q.sampleInput}
                  </pre>
                  <pre className="overflow-x-auto rounded-lg bg-background/60 p-2 font-mono">
                    Output{"\n"}
                    {q.sampleOutput}
                  </pre>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Constraints: {(q.constraints ?? []).join(" · ")} · Time {q.timeLimitMs} ms · Memory{" "}
                  {q.memoryLimitMb} MB
                </p>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>

      {/* ------------------------- publish / re-evaluate --------------------- */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{publishedTest ? "Update published test" : "Publish test"}</DialogTitle>
            <DialogDescription>
              {publishedTest
                ? "Every student's previously submitted solution will be re-judged against the updated questions and hidden test cases. Marks, results and the leaderboard are lifted automatically — no submission is ever deleted."
                : `${questions.length} questions will be released to all students for 60 minutes.`}
            </DialogDescription>
          </DialogHeader>
          {publishedTest && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for edit (logged in Edit History)</Label>
              <Textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Corrected hidden test case for Q3 output format"
                maxLength={300}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPublish} className="font-semibold">
              {publishedTest ? "Update & re-evaluate" : "Publish 1-hour test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
