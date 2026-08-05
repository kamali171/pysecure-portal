import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { VIOLATION_LIMIT, detectSEB } from "@/lib/pysecure";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/exam/rules")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Examination Rules — PySecure" },
      {
        name: "description",
        content:
          "Read and accept the PySecure examination rules covering webcam, tab switching, fullscreen and proctoring violations.",
      },
      { property: "og:title", content: "Examination Rules — PySecure" },
      { property: "og:description", content: "Integrity rules for AI-proctored Python exams." },
    ],
  }),
  component: Rules,
});

const RULES = [
  {
    title: "Webcam must remain on",
    text: "Your camera and microphone stay active for the entire session. Covering the lens is a violation.",
  },
  {
    title: "No tab or window switching",
    text: "Leaving the exam tab, opening another app or using a second screen is logged instantly.",
  },
  {
    title: "No exiting fullscreen",
    text: "The exam runs locked in fullscreen. Pressing Esc or minimising raises a violation.",
  },
  {
    title: "No mobile phone usage",
    text: "Phones, smart watches and tablets must be out of the frame. Object detection flags devices.",
  },
  {
    title: "No multiple persons",
    text: "Only the registered candidate may appear on camera. Extra faces end the attempt.",
  },
  {
    title: "Automatic submission",
    text: `After ${VIOLATION_LIMIT} violations your paper is submitted automatically and forwarded to the examination cell.`,
  },
];

function Rules() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const seb = detectSEB();

  if (!seb.ok) {
    return (
      <AppShell>
        <PageTitle
          title="Safe Exam Browser Required"
          subtitle="This assessment can only be taken using Safe Exam Browser."
        />
        <div className="glass rise mx-auto max-w-xl rounded-3xl p-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/15 text-destructive">
            <AlertTriangle className="size-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">This assessment can only be taken using Safe Exam Browser.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Safe Exam Browser was not detected on this device ({seb.reason}). The exam remains locked until you open it inside the approved kiosk environment.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => router.navigate({ to: "/exam/check" })}>Retry Detection</Button>
            <Link to="/dashboard" className="sm:w-40">
              <Button variant="outline" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageTitle
        title="Examination Rules & Integrity Agreement"
        subtitle="Daily Python Assessment · 60 minutes · AI proctored"
      />

      <div className="glass rise mx-auto max-w-3xl rounded-3xl p-8">
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 size-5 text-warning" />
          <p className="text-sm">
            Every action is recorded against your trust score. Violations are visible to faculty in
            real time on the AI Proctor dashboard.
          </p>
        </div>

        <ol className="space-y-4">
          {RULES.map((r, i) => (
            <li
              key={r.title}
              className="flex gap-4 rounded-2xl border border-border/70 bg-card/60 p-4"
            >
              <span className="brand-gradient grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl bg-secondary/70 p-4">
          <Checkbox
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            className="mt-0.5"
          />
          <span className="text-sm font-medium">
            I have read and accept all examination rules. I understand that repeated violations will
            auto-submit my paper and may lead to disciplinary action.
          </span>
        </label>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/dashboard" className="sm:w-40">
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
          <Button
            className="h-11 flex-1 text-base font-semibold"
            disabled={!accepted}
            onClick={() => router.navigate({ to: "/exam/live" })}
          >
            Accept & Start Exam
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
