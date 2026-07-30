import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageTitle } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { activeTest, getResults, getSession, type Result } from "@/lib/pysecure";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, Gauge, Percent, Target } from "lucide-react";

export const Route = createFileRoute("/results")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Results & Analytics — PySecure KIOT" },
      {
        name: "description",
        content:
          "Score trends, topic-wise strength, trust score history and detailed attempt records in PySecure.",
      },
      { property: "og:title", content: "Results & Analytics — PySecure KIOT" },
      { property: "og:description", content: "Understand your Python performance topic by topic." },
    ],
  }),
  component: Results,
});

function Results() {
  const [results, setResults] = useState<Result[]>([]);
  const [topics, setTopics] = useState<{ name: string; accuracy: number }[]>([]);

  useEffect(() => {
    const s = getSession();
    setResults(getResults(s?.id));
    const t = activeTest();
    setTopics(
      t.topics.map((name, i) => ({ name, accuracy: [78, 64, 88, 71, 59][i % 5] })),
    );
  }, []);

  const trend = [...results]
    .reverse()
    .map((r, i) => ({
      name: `Attempt ${i + 1}`,
      score: Math.round((r.score / r.total) * 100),
      trust: r.trustScore,
    }));

  const avgScore = trend.length ? Math.round(trend.reduce((a, b) => a + b.score, 0) / trend.length) : 0;
  const avgTrust = trend.length ? Math.round(trend.reduce((a, b) => a + b.trust, 0) / trend.length) : 100;
  const best = trend.length ? Math.max(...trend.map((t) => t.score)) : 0;

  return (
    <AppShell>
      <PageTitle
        title="Results & Analytics"
        subtitle="Score trends, topic strengths and proctoring integrity across your attempts."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Attempts", value: results.length, icon: Target },
          { label: "Average Score", value: `${avgScore}%`, icon: Percent },
          { label: "Best Score", value: `${best}%`, icon: Award },
          { label: "Average Trust", value: `${avgTrust}%`, icon: Gauge },
        ].map((s) => (
          <div key={s.label} className="glass rise rounded-2xl p-5">
            <s.icon className="size-5 text-primary" />
            <p className="mt-3 font-display text-3xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass rise rounded-3xl p-6">
          <h3 className="mb-4 font-semibold">Score vs Trust Trend</h3>
          <div className="h-64">
            {trend.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                Complete a test to see your trend.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis domain={[0, 100]} fontSize={12} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="var(--brand)" strokeWidth={3} />
                  <Line type="monotone" dataKey="trust" stroke="var(--success)" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass rise rounded-3xl p-6">
          <h3 className="mb-4 font-semibold">Topic-wise Accuracy</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topics} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" domain={[0, 100]} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis type="category" dataKey="name" width={110} fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }}
                />
                <Bar dataKey="accuracy" radius={[0, 8, 8, 0]} fill="var(--brand-soft)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass rise mt-6 rounded-3xl p-6">
        <h3 className="mb-4 font-semibold">Attempt History</h3>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attempts recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Trust</TableHead>
                <TableHead>Violations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.testTitle}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.date).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {r.score}/{r.total}
                  </TableCell>
                  <TableCell className="w-40">
                    <Progress value={(r.score / r.total) * 100} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.trustScore > 70 ? "secondary" : "destructive"}>
                      {r.trustScore}%
                    </Badge>
                  </TableCell>
                  <TableCell>{r.violations}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppShell>
  );
}
