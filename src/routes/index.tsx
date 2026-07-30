import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, setSession } from "@/lib/pysecure";
import { Camera, Cpu, Gauge, LockKeyhole, ScanFace, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PySecure — AI-Proctored Python Exams | KIOT" },
      {
        name: "description",
        content:
          "Sign in to PySecure, the KIOT Python secure assessment portal with AI proctoring, trust scoring and instant analytics.",
      },
      { property: "og:title", content: "PySecure — AI-Proctored Python Exams | KIOT" },
      {
        property: "og:description",
        content: "Secure, AI-proctored Python assessments for KIOT students and faculty.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ScanFace, title: "AI Proctoring", text: "Face, phone & gaze detection in real time." },
  { icon: Gauge, title: "Trust Score", text: "Live integrity score with auto-submit limits." },
  { icon: Cpu, title: "Code Editor", text: "HackerRank-style run, test and submit flow." },
  { icon: Camera, title: "System Check", text: "Webcam, mic, network and SEB verification." },
];

function Landing() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const student = login(id, pw);
    if (!student) {
      toast.error("Invalid credentials", { description: "Check your register number and password." });
      return;
    }
    setSession(student);
    toast.success(`Welcome back, ${student.firstName}`);
    router.navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Link to="/faculty">
            <Button variant="ghost" size="sm">
              Faculty
            </Button>
          </Link>
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              Admin
            </Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-10 lg:grid-cols-[1.15fr_1fr] lg:py-16">
        <div className="rise">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
            <Sparkles className="size-3.5" /> Knowledge Institute of Technology
          </span>
          <h1 className="mt-6 text-5xl leading-[1.05] font-extrabold lg:text-6xl">
            Python assessments, <span className="brand-text">secured by AI.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            PySecure runs daily one-hour Python examinations with webcam proctoring, violation
            tracking, live trust scoring and instant department-wide analytics.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass rounded-2xl p-4">
                <f.icon className="size-5 text-primary" />
                <p className="mt-3 font-semibold">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rise rounded-3xl p-8">
          <div className="mb-6 flex items-center gap-2 text-primary">
            <LockKeyhole className="size-5" />
            <h2 className="text-xl font-bold">Student Login</h2>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="id">Register Number or Email</Label>
              <Input
                id="id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="7376221CS101"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">Password</Label>
              <Input
                id="pw"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="h-11 w-full text-base font-semibold">
              Sign in securely
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            New student?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create your account
            </Link>
          </p>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-4 py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} KIOT · PySecure Assessment Portal · Examination Cell
      </footer>
    </div>
  );
}
