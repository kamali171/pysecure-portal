import { Link, useRouter } from "@tanstack/react-router";
import { ShieldCheck, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { getSession, setSession } from "@/lib/pysecure";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="brand-gradient grid size-10 place-items-center rounded-xl text-primary-foreground shadow-lg">
        <ShieldCheck className="size-5" />
      </span>
      <span className={compact ? "hidden sm:block" : ""}>
        <span className="block font-display text-lg leading-none font-extrabold tracking-tight">
          Py<span className="brand-text">Secure</span>
        </span>
        <span className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          KIOT Assessment Portal
        </span>
      </span>
    </Link>
  );
}

const NAV = [
  { to: "/dashboard", label: "Student" },
  { to: "/faculty", label: "Faculty" },
  { to: "/proctor", label: "AI Proctor" },
  { to: "/results", label: "Analytics" },
  { to: "/admin", label: "Admin" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = typeof window !== "undefined" ? getSession() : null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Logo compact />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <span className="hidden text-right sm:block">
                  <span className="block text-sm font-semibold">
                    {session.firstName} {session.lastName}
                  </span>
                  <span className="block text-xs text-muted-foreground">{session.regNo}</span>
                </span>
                <button
                  onClick={() => {
                    setSession(null);
                    router.navigate({ to: "/" });
                  }}
                  className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent"
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" />
                </button>
              </>
            ) : (
              <Link
                to="/"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rise mb-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
