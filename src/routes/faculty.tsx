import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  generateHint,
  generateTestCases,
  getTests,
  inferDifficulty,
  saveTest,
  TOPICS,
  uid,
  type Question,
  type Test,
} from "@/lib/pysecure";
import { Sparkles, Plus, Trash2, BookOpen } from "lucide-react";

export const Route = createFileRoute("/faculty")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Faculty Panel — Create Python Tests | PySecure" },
      {
        name: "description",
        content:
          "Faculty tools to build daily one-hour Python tests with auto-generated hints, test cases and difficulty tagging.",
      },
      { property: "og:title", content: "Faculty Panel — PySecure" },
      { property: "og:description", content: "Create AI-assisted Python assessments in minutes." },
    ],
  }),
  component: Faculty,
});

function Faculty() {
  const [topics, setTopics] = useState<string[]>([]);
  const [title, setTitle] = useState("Daily Python Assessment");
  const [qTitle, setQTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [expected, setExpected] = useState("");
  const [draft, setDraft] = useState<Question[]>([]);
  const [tests, setTests] = useState<Test[]>([]);

  useEffect(() => setTests(getTests()), []);

  const toggle = (t: string) =>
    setTopics((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  function addQuestion() {
    if (!qTitle.trim() || !prompt.trim()) return toast.error("Question title and description required");
    if (topics.length === 0) return toast.error("Select at least one syllabus topic");
    const topic = topics[draft.length % topics.length];
    const q: Question = {
      id: uid(),
      topic,
      title: qTitle.trim().slice(0, 100),
      prompt: prompt.trim().slice(0, 1000),
      difficulty: inferDifficulty(prompt),
      hint: generateHint(topic, prompt),
      expectedOutput: expected.trim() || generateTestCases(prompt)[0].output,
      testCases: generateTestCases(prompt),
      starter: "# Write your Python solution here\n",
    };
    setDraft((d) => [...d, q]);
    setQTitle("");
    setPrompt("");
    setExpected("");
    toast.success("AI generated hint, test cases & difficulty", { description: `${q.difficulty} · ${topic}` });
  }

  function publish() {
    if (draft.length === 0) return toast.error("Add at least one question");
    const test: Test = {
      id: uid(),
      title: title.trim() || "Daily Python Assessment",
      topics,
      date: new Date().toISOString(),
      durationMin: 60,
      questions: draft,
    };
    saveTest(test);
    setTests(getTests());
    setDraft([]);
    toast.success("Test published to all students");
  }

  return (
    <AppShell>
      <PageTitle
        title="Faculty Panel"
        subtitle="Create today's one-hour Python test. Hints, expected output, sample cases and difficulty are generated automatically."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="glass rise space-y-6 rounded-3xl p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Test Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
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

          <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="font-semibold">Add Question</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qt">Question Title</Label>
              <Input
                id="qt"
                value={qTitle}
                onChange={(e) => setQTitle(e.target.value)}
                placeholder="Find the largest element in a list"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qp">Problem Statement</Label>
              <Textarea
                id="qp"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the task, input format and output format..."
                maxLength={1000}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qe">Expected Output (optional — auto-filled)</Label>
              <Input id="qe" value={expected} onChange={(e) => setExpected(e.target.value)} maxLength={200} />
            </div>
            <Button onClick={addQuestion} className="w-full gap-2">
              <Plus className="size-4" /> Generate & Add Question
            </Button>
          </div>

          {draft.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Draft Questions ({draft.length})</h3>
              {draft.map((q, i) => (
                <div key={q.id} className="rounded-2xl border border-border/70 bg-card/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {i + 1}. {q.title}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Badge variant="secondary">{q.topic}</Badge>
                        <Badge>{q.difficulty}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">💡 {q.hint}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        expected: {q.expectedOutput}
                      </p>
                    </div>
                    <button
                      onClick={() => setDraft((d) => d.filter((x) => x.id !== q.id))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove question"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
              <Button onClick={publish} className="h-11 w-full text-base font-semibold">
                Publish 1-hour test
              </Button>
            </div>
          )}
        </div>

        <aside className="glass rise h-fit rounded-3xl p-6">
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
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </AppShell>
  );
}
