import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageTitle } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getResults,
  getSession,
  getStudents,
  getTests,
  getViolations,
  type Result,
  type Student,
  type Violation,
} from "@/lib/pysecure";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GraduationCap, ListChecks, ShieldAlert, Users } from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: () => {
    const session = getSession();
    if (!session || session.role !== "admin") {
      throw redirect({ to: "/admin/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Admin Dashboard — PySecure KIOT" },
      {
        name: "description",
        content:
          "Institution-wide view of registered students, published tests, attempts and proctoring violations.",
      },
      { property: "og:title", content: "Admin Dashboard — PySecure KIOT" },
      { property: "og:description", content: "Examination cell control centre for PySecure." },
    ],
  }),
  component: Admin,
});

const COLORS = ["var(--brand)", "var(--brand-soft)", "var(--success)", "var(--warning)", "var(--destructive)"];

function Admin() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [testCount, setTestCount] = useState(0);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "admin") {
      router.navigate({ to: "/admin/login" });
      return;
    }
    setStudents(getStudents());
    setResults(getResults());
    setViolations(getViolations());
    setTestCount(getTests().length);
  }, [router]);

  const byDept = Object.entries(
    students.reduce<Record<string, number>>((acc, s) => {
      acc[s.department] = (acc[s.department] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const byViolation = Object.entries(
    violations.reduce<Record<string, number>>((acc, v) => {
      acc[v.type] = (acc[v.type] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name: name.replace(" detected", ""), value }));

  const stats = [
    { label: "Registered Students", value: students.length, icon: Users },
    { label: "Published Tests", value: testCount, icon: ListChecks },
    { label: "Attempts Recorded", value: results.length, icon: GraduationCap },
    { label: "Violations Logged", value: violations.length, icon: ShieldAlert },
  ];

  return (
    <AppShell>
      <PageTitle
        title="Admin Dashboard"
        subtitle="Examination cell overview across departments, tests and proctoring integrity."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rise rounded-2xl p-5">
            <s.icon className="size-5 text-primary" />
            <p className="mt-3 font-display text-3xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass rise rounded-3xl p-6">
          <h3 className="mb-4 font-semibold">Students by Department</h3>
          <div className="h-64">
            {byDept.length === 0 ? (
              <Empty text="No registrations yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDept}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis allowDecimals={false} fontSize={12} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--brand)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass rise rounded-3xl p-6">
          <h3 className="mb-4 font-semibold">Violation Distribution</h3>
          <div className="h-64">
            {byViolation.length === 0 ? (
              <Empty text="No violations recorded." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byViolation} dataKey="value" nameKey="name" outerRadius={95} label>
                    {byViolation.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="glass rise mt-6 rounded-3xl p-6">
        <h3 className="mb-4 font-semibold">Registered Students</h3>
        {students.length === 0 ? (
          <Empty text="No students registered yet." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Register No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Year / Section</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Attempts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.regNo}</TableCell>
                  <TableCell className="font-medium">
                    {s.firstName} {s.lastName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s.department}</Badge>
                  </TableCell>
                  <TableCell>
                    {s.year} / {s.section}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                  <TableCell>{results.filter((r) => r.studentId === s.id).length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppShell>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="grid h-full place-items-center text-sm text-muted-foreground">{text}</div>
  );
}
