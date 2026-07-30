import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  clearViolations,
  getViolations,
  uid,
  VIOLATION_LIMIT,
  VIOLATION_TYPES,
  type Violation,
} from "@/lib/pysecure";
import { Activity, Eye, ScanFace, ShieldAlert, Smartphone, Users } from "lucide-react";

export const Route = createFileRoute("/proctor")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "AI Proctor Dashboard — PySecure" },
      {
        name: "description",
        content:
          "Live AI proctoring: webcam feed, face and phone detection, violation stream and trust scoring.",
      },
      { property: "og:title", content: "AI Proctor Dashboard — PySecure" },
      { property: "og:description", content: "Real-time exam integrity monitoring for faculty." },
    ],
  }),
  component: Proctor,
});

const DETECTORS = [
  { key: "Tab switching", icon: Eye },
  { key: "Fullscreen exit", icon: ShieldAlert },
  { key: "No face detected", icon: ScanFace },
  { key: "Multiple faces", icon: Users },
  { key: "Mobile phone", icon: Smartphone },
  { key: "Head movement", icon: Activity },
];

function Proctor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [violations, setViolations] = useState<Violation[]>([]);

  useEffect(() => {
    setViolations(getViolations());
    const i = setInterval(() => setViolations(getViolations()), 2000);
    return () => {
      clearInterval(i);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startFeed = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setLive(true);
    } catch {
      setLive(false);
    }
  }, []);

  useEffect(() => {
    startFeed();
  }, [startFeed]);

  const simulate = () => {
    const v = VIOLATION_TYPES[Math.floor(Math.random() * VIOLATION_TYPES.length)];
    const entry: Violation = {
      id: uid(),
      studentId: "sim",
      studentName: "Simulated Candidate",
      type: v.type,
      penalty: v.penalty,
      at: new Date().toISOString(),
    };
    const next = [entry, ...violations];
    setViolations(next);
    window.localStorage.setItem("pysecure.violations", JSON.stringify(next.slice(0, 200)));
  };

  const trust = Math.max(0, 100 - violations.reduce((a, v) => a + v.penalty, 0));

  return (
    <AppShell>
      <PageTitle
        title="AI Proctor Dashboard"
        subtitle="Computer-vision monitoring with automatic trust scoring and submission enforcement."
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="glass rise rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Live Candidate Feed</h3>
            <span
              className={`flex items-center gap-2 text-xs font-semibold ${live ? "text-success" : "text-destructive"}`}
            >
              <span
                className={`size-2 rounded-full ${live ? "animate-pulse bg-success" : "bg-destructive"}`}
              />
              {live ? "LIVE" : "OFFLINE"}
            </span>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-foreground/90">
            <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
            <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-success/70" />
            <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 font-mono text-[11px] text-white">
              face_detected: 1 · phone: 0 · gaze: centre
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {DETECTORS.map((d) => {
              const hits = violations.filter((v) =>
                v.type.toLowerCase().includes(d.key.split(" ")[0].toLowerCase()),
              ).length;
              return (
                <div key={d.key} className="rounded-xl border border-border/70 bg-card/60 p-3">
                  <d.icon className={`size-4 ${hits ? "text-destructive" : "text-success"}`} />
                  <p className="mt-2 text-xs font-semibold">{d.key}</p>
                  <p className="text-xs text-muted-foreground">{hits} events</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={simulate}>
              Simulate detection
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => {
                clearViolations();
                setViolations([]);
              }}
            >
              Clear log
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rise rounded-3xl p-6">
            <h3 className="mb-2 font-semibold">Trust Score</h3>
            <p
              className={`font-display text-5xl font-extrabold ${trust > 70 ? "text-success" : trust > 40 ? "text-warning" : "text-destructive"}`}
            >
              {trust}%
            </p>
            <Progress value={trust} className="mt-3" />
            <p className="mt-3 text-xs text-muted-foreground">
              {violations.length}/{VIOLATION_LIMIT} violations before automatic submission.
            </p>
          </div>

          <div className="glass rise rounded-3xl p-6">
            <h3 className="mb-4 font-semibold">Violation Stream</h3>
            {violations.length === 0 ? (
              <p className="text-sm text-muted-foreground">All candidates are clean right now.</p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-auto pr-1">
                {violations.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-xl border border-destructive/25 bg-destructive/8 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-destructive">{v.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.studentName} · {new Date(v.at).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-destructive">-{v.penalty}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
