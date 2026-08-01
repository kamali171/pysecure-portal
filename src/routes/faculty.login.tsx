import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSession, loginAsRole, setSession } from "@/lib/pysecure";
import { LockKeyhole, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/faculty/login")({
  ssr: false,
  beforeLoad: () => {
    const session = getSession();
    if (session?.role === "faculty") {
      throw redirect({ to: "/faculty" });
    }
    if (session?.role === "student") {
      throw redirect({ to: "/dashboard" });
    }
    if (session?.role === "admin") {
      throw redirect({ to: "/admin" });
    }
  },
  head: () => ({
    meta: [
      { title: "Faculty Login — PySecure" },
      { name: "description", content: "Sign in to the faculty dashboard for PySecure assessment management." },
    ],
  }),
  component: FacultyLogin,
});

function FacultyLogin() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const session = loginAsRole("faculty", id, pw);
    if (!session) {
      toast.error("Invalid credentials", { description: "Use your faculty credentials to continue." });
      return;
    }

    setSession(session);
    toast.success(`Welcome back, ${session.firstName}`);
    router.navigate({ to: "/faculty" });
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
        <Logo />
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          Back to roles
        </Link>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-10 lg:grid-cols-[1fr_0.9fr] lg:py-16">
        <div className="rise">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
            <Sparkles className="size-3.5" /> Faculty Access
          </span>
          <h1 className="mt-6 text-4xl leading-tight font-extrabold lg:text-5xl">
            Manage assessments from your <span className="brand-text">faculty workspace</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Create and publish Python tests, review drafts and keep your faculty dashboard focused on exam creation.
          </p>
          <div className="mt-8 rounded-2xl border border-border/70 bg-card/60 p-4">
            <div className="flex items-center gap-2 text-primary">
              <Users className="size-4" />
              <p className="font-semibold">One role, one dashboard</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Faculty access stays isolated from student and admin workflows after sign-in.
            </p>
          </div>
        </div>

        <div className="glass rise rounded-3xl p-8">
          <div className="mb-6 flex items-center gap-2 text-primary">
            <LockKeyhole className="size-5" />
            <h2 className="text-xl font-bold">Faculty Login</h2>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="id">Faculty ID or Email</Label>
              <Input
                id="id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="faculty@kiot.ac.in"
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
              Continue to faculty panel
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
