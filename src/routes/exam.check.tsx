import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Loader2,
  Maximize,
  Mic,
  ShieldCheck,
  Wifi,
  XCircle,
  Camera,
} from "lucide-react";
import { detectSEB } from "@/lib/pysecure";

export const Route = createFileRoute("/exam/check")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "System Compatibility Check — PySecure" },
      {
        name: "description",
        content:
          "Verify webcam, microphone, internet, fullscreen and Safe Exam Browser before starting your PySecure exam.",
      },
      { property: "og:title", content: "System Compatibility Check — PySecure" },
      {
        property: "og:description",
        content: "Hardware and environment verification for AI-proctored exams.",
      },
    ],
  }),
  component: SystemCheck,
});

type Status = "pending" | "checking" | "pass" | "fail";
type CheckKey = "webcam" | "mic" | "network" | "fullscreen" | "seb";

const META: Record<CheckKey, { label: string; hint: string; icon: typeof Camera }> = {
  webcam: { label: "Webcam", hint: "Required for continuous face monitoring", icon: Camera },
  mic: { label: "Microphone", hint: "Detects background voices and conversation", icon: Mic },
  network: { label: "Internet Connection", hint: "Stable link for answer autosave", icon: Wifi },
  fullscreen: { label: "Fullscreen Mode", hint: "Browser must support locked fullscreen", icon: Maximize },
  seb: { label: "Safe Exam Browser", hint: "Kiosk environment / lockdown handshake", icon: ShieldCheck },
};

const ORDER: CheckKey[] = ["webcam", "mic", "network", "fullscreen", "seb"];

function SystemCheck() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Record<CheckKey, Status>>({
    webcam: "pending",
    mic: "pending",
    network: "pending",
    fullscreen: "pending",
    seb: "pending",
  });
  const [running, setRunning] = useState(false);
  const [sebReason, setSebReason] = useState("");

  const set = (k: CheckKey, v: Status) => setStatus((s) => ({ ...s, [k]: v }));

  const runChecks = useCallback(async () => {
    setRunning(true);
    setStatus({
      webcam: "checking",
      mic: "pending",
      network: "pending",
      fullscreen: "pending",
      seb: "pending",
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      set("webcam", stream.getVideoTracks().length > 0 ? "pass" : "fail");
      set("mic", "checking");
      await wait(500);
      set("mic", stream.getAudioTracks().length > 0 ? "pass" : "fail");
    } catch {
      set("webcam", "fail");
      set("mic", "fail");
    }

    set("network", "checking");
    await wait(600);
    set("network", navigator.onLine ? "pass" : "fail");

    set("fullscreen", "checking");
    await wait(400);
    set("fullscreen", document.fullscreenEnabled ? "pass" : "fail");

    set("seb", "checking");
    await wait(700);
    // Lockdown handshake: real SEB injects a UA token / JS API.
    const sebResult = detectSEB();
    setSebReason(sebResult.reason);
    set("seb", sebResult.ok ? "pass" : "fail");
    setRunning(false);
  }, []);

  useEffect(() => {
    runChecks();
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [runChecks]);

  const values = ORDER.map((k) => status[k]);
  const done = values.filter((v) => v === "pass" || v === "fail").length;
  const allPass = values.every((v) => v === "pass");
  const sebBlocked = status.seb === "fail";

  return (
    <AppShell>
      <PageTitle
        title="System Compatibility Check"
        subtitle="All five checks must pass before the exam can be unlocked."
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass rise rounded-3xl p-6">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {done}/{ORDER.length} verified
            </span>
            <Button variant="outline" size="sm" onClick={runChecks} disabled={running}>
              Retry Detection
            </Button>
          </div>
          <Progress value={(done / ORDER.length) * 100} className="mb-6" />

          {sebBlocked && (
            <div className="mb-5 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              This assessment can only be taken using Safe Exam Browser.
            </div>
          )}

          <ul className="space-y-3">
            {ORDER.map((k) => {
              const Icon = META[k].icon;
              const s = status[k];
              return (
                <li
                  key={k}
                  className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card/60 p-4"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">{META[k].label}</p>
                    <p className="text-xs text-muted-foreground">
                      {k === "seb" && sebReason ? sebReason : META[k].hint}
                    </p>
                  </div>
                  {s === "pass" && <CheckCircle2 className="size-6 text-success" />}
                  {s === "fail" && <XCircle className="size-6 text-destructive" />}
                  {s === "checking" && <Loader2 className="size-5 animate-spin text-primary" />}
                  {s === "pending" && (
                    <span className="text-xs text-muted-foreground">Queued</span>
                  )}
                </li>
              );
            })}
          </ul>

          <Button
            className="mt-6 h-12 w-full text-base font-semibold"
            disabled={!allPass}
            onClick={() => router.navigate({ to: "/exam/rules" })}
          >
            {allPass ? "Continue to Exam Rules" : "Resolve failed checks to continue"}
          </Button>
          {!allPass && !running && (
            <p className="mt-3 text-center text-xs text-destructive">
              Start Exam is disabled until every requirement passes.
            </p>
          )}
        </div>

        <div className="glass rise rounded-3xl p-6">
          <h3 className="mb-4 font-semibold">Camera Preview</h3>
          <div className="aspect-video overflow-hidden rounded-2xl bg-foreground/90">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="size-full object-cover"
            />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Sit centred in the frame with even lighting. Your face must stay visible for the full
            duration of the examination.
          </p>
          <Link to="/dashboard">
            <Button variant="ghost" className="mt-4 w-full">
              Back to dashboard
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
