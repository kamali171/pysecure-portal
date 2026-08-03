import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  activeTest,
  getResults,
  getSession,
  NOTIFICATIONS,
  type Result,
  type AuthSession,
  type Test,
} from "@/lib/pysecure";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Bell, CalendarClock, PlayCircle, Timer, TrendingUp, Trophy } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  beforeLoad: () => {
    const session = getSession();
    if (!session || session.role !== "student") {
      throw redirect({ to: "/student/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Student Dashboard — PySecure KIOT" },
      {
        name: "description",
        content:
          "Track upcoming Python tests, previous results, performance trends and notifications in PySecure.",
      },
      { property: "og:title", content: "Student Dashboard — PySecure KIOT" },
      { property: "og:description", content: "Your Python assessment hub at KIOT." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<AuthSession | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [test, setTest] = useState<Test | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "student") {
      router.navigate({ to: "/student/login" });
      return;
    }
    setStudent(s);
    setResults(getResults(s.id));
    setTest(activeTest());
  }, [router]);

  if (!student || !test) return null;

  const history = [...results].reverse();
  const chartData =
    history.length > 0
      ? history.map((r, i) => ({
          name: `T${i + 1}`,
          score: Math.round((r.score / r.total) * 100),
          trust: r.trustScore,
        }))
      : [
          { name: "T1", score: 62, trust: 90 },
          { name: "T2", score: 71, trust: 95 },
          { name: "T3", score: 78, trust: 88 },
          { name: "T4", score: 85, trust: 97 },
        ];

  const avg = Math.round(chartData.reduce((a, b) => a + b.score, 0) / chartData.length);

  return (
    <AppShell>
      <PageTitle
        title={`Hello, ${student.firstName} 👋`}
        subtitle={`${student.department} · Year ${student.year} · Section ${student.section} · ${student.regNo}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass rise rounded-3xl p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge className="mb-3 gap-1">
                <CalendarClock className="size-3" /> Upcoming Test
              </Badge>
              <h2 className="text-2xl font-bold">{test.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {test.questions.length} questions · {test.durationMin} minutes · AI proctored
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {test.topics.map((t) => (
                  <span key={t} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                <Timer className="size-4" /> Window
              </p>
              <p className="font-display text-2xl font-bold">4:00 PM</p>
            </div>
          </div>
          <Link to="/exam/check">
            <Button className="mt-6 h-12 w-full gap-2 text-base font-semibold">
              <PlayCircle className="size-5" /> Start Test
            </Button>
          </Link>
        </div>

        <div className="glass rise rounded-3xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <h3 className="font-semibold">Notifications</h3>
          </div>
          <ul className="space-y-3">
            {NOTIFICATIONS.map((n) => (
              <li key={n.title} className="rounded-xl border border-border/70 bg-card/60 p-3">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.time}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rise rounded-3xl p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <h3 className="font-semibold">Performance Graph</h3>
            </div>
            <span className="text-sm text-muted-foreground">Average {avg}%</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="var(--brand)"
                  strokeWidth={3}
                  fill="url(#g1)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rise rounded-3xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="size-4 text-primary" />
            <h3 className="font-semibold">Previous Results</h3>
          </div>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No attempts yet. Your first result appears here after the daily test.
            </p>
          ) : (
            <ul className="space-y-4">
              {results.slice(0, 4).map((r) => (
                <li key={r.id}>
                  <div className="flex justify-between text-sm font-medium">
                    <span>{r.testTitle}</span>
                    <span>
                      {r.score}/{r.total}
                    </span>
                  </div>
                  <Progress className="mt-2" value={(r.score / r.total) * 100} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Trust {r.trustScore}% · {new Date(r.date).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/results">
            <Button variant="outline" className="mt-5 w-full">
              View analytics
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
