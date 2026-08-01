import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Camera, Cpu, Gauge, ScanFace, Sparkles, Users, GraduationCap, ShieldCheck } from "lucide-react";

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
  const roles = [
    {
      title: "Student",
      description: "Access your dashboard, upcoming tests and performance insights.",
      icon: GraduationCap,
      to: "/student/login",
    },
    {
      title: "Faculty",
      description: "Create assessments, manage drafts and publish tests.",
      icon: Users,
      to: "/faculty/login",
    },
    {
      title: "Admin",
      description: "Monitor institution-wide assessment activity and integrity trends.",
      icon: ShieldCheck,
      to: "/admin/login",
    },
  ] as const;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
        <Logo />
        <div className="text-sm text-muted-foreground">Choose your role</div>
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
            <Sparkles className="size-5" />
            <h2 className="text-xl font-bold">Choose a role</h2>
          </div>
          <div className="space-y-3">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <Link key={role.title} to={role.to} className="block">
                  <div className="rounded-2xl border border-border/70 bg-card/60 p-4 transition-colors hover:border-primary/40 hover:bg-accent/50">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <p className="font-semibold">{role.title}</p>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
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
