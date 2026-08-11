/**
 * Safe Exam Browser (SEB) detection service.
 *
 * Single source of truth for "are we running inside SEB?" — every exam screen
 * imports from here instead of re-implementing checks.
 *
 * How real detection works (all three signals are produced by SEB itself, not
 * by page JavaScript):
 *  1. User agent — SEB appends a "SEB/<version>" token to the browser UA.
 *  2. JavaScript API — SEB injects a `SafeExamBrowser` global exposing
 *     `security.browserExamKey` / `configKey` and `security.updateKeys()`.
 *  3. Request headers — SEB attaches `X-SafeExamBrowser-RequestHash` and
 *     `X-SafeExamBrowser-ConfigKeyHash` to every HTTP request. These cannot be
 *     read in the browser, so we ask the server (see
 *     `src/routes/api/public/seb-status.ts`) whether it saw them.
 *
 * IMPORTANT: OS-level lockdown (Alt+Tab, Windows key, task switching, screen
 * capture) is enforced by SEB's kiosk mode. Web JavaScript cannot do this, and
 * this module never pretends otherwise.
 */

export type SebSignalName = "userAgent" | "jsApi" | "requestHeaders";

export type SebSignal = {
  name: SebSignalName;
  label: string;
  ok: boolean;
  detail: string;
};

export type SebDetection = {
  /** True only when at least one authentic SEB signal is present. */
  ok: boolean;
  /** Short human-readable explanation, safe to show in the UI. */
  reason: string;
  signals: SebSignal[];
};

type SebGlobal = {
  security?: {
    browserExamKey?: string;
    configKey?: string;
    updateKeys?: (cb?: () => void) => void;
  };
  version?: string;
};

function sebGlobal(): SebGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { SafeExamBrowser?: SebGlobal }).SafeExamBrowser;
}

/** SEB user-agent token, e.g. "SEB/3.5.0". */
function uaSignal(): SebSignal {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent || "";
  const m = ua.match(/SEB[\s/]([\d.]+)/i);
  if (m) {
    return {
      name: "userAgent",
      label: "SEB browser signature",
      ok: true,
      detail: `Safe Exam Browser ${m[1]} user agent`,
    };
  }
  if (/SafeExamBrowser/i.test(ua)) {
    return {
      name: "userAgent",
      label: "SEB browser signature",
      ok: true,
      detail: "Safe Exam Browser user agent",
    };
  }
  return {
    name: "userAgent",
    label: "SEB browser signature",
    ok: false,
    detail: "No SEB token in the browser user agent",
  };
}

/** SEB-injected JavaScript API with browser exam / config keys. */
function jsApiSignal(): SebSignal {
  const seb = sebGlobal();
  const keys = seb?.security;
  if (keys && (keys.browserExamKey || keys.configKey || typeof keys.updateKeys === "function")) {
    return {
      name: "jsApi",
      label: "SEB JavaScript API",
      ok: true,
      detail: seb?.version
        ? `SafeExamBrowser API present (v${seb.version})`
        : "SafeExamBrowser API present",
    };
  }
  return {
    name: "jsApi",
    label: "SEB JavaScript API",
    ok: false,
    detail: "SafeExamBrowser JavaScript API not injected",
  };
}

function summarise(signals: SebSignal[]): SebDetection {
  const passed = signals.filter((s) => s.ok);
  return {
    ok: passed.length > 0,
    reason: passed.length
      ? passed.map((s) => s.detail).join(" · ")
      : "Safe Exam Browser was not detected — this page is running in a normal browser",
    signals,
  };
}

/**
 * Synchronous, client-only detection (user agent + injected API).
 * Use when a render pass needs an immediate answer; prefer `verifySEB()`.
 */
export function detectSEBSync(): SebDetection {
  if (typeof window === "undefined") {
    return {
      ok: false,
      reason: "Detection runs in the browser",
      signals: [],
    };
  }
  return summarise([uaSignal(), jsApiSignal()]);
}

/** Ask the server whether the request carried SEB's own headers. */
async function headerSignal(): Promise<SebSignal> {
  try {
    const res = await fetch("/api/public/seb-status", {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as {
      seb?: boolean;
      requestHash?: boolean;
      configKeyHash?: boolean;
      userAgentSeb?: boolean;
    };
    if (data.seb) {
      const parts = [
        data.requestHash ? "request hash" : null,
        data.configKeyHash ? "config key hash" : null,
        data.userAgentSeb ? "server-side UA token" : null,
      ].filter(Boolean);
      return {
        name: "requestHeaders",
        label: "SEB request headers",
        ok: true,
        detail: `Verified by server (${parts.join(", ")})`,
      };
    }
    return {
      name: "requestHeaders",
      label: "SEB request headers",
      ok: false,
      detail: "Server did not receive SEB request headers",
    };
  } catch {
    return {
      name: "requestHeaders",
      label: "SEB request headers",
      ok: false,
      detail: "Could not reach the verification service",
    };
  }
}

/**
 * Full detection: client signals plus the server-side header handshake.
 * This is the check the exam flow must gate on.
 */
export async function verifySEB(): Promise<SebDetection> {
  if (typeof window === "undefined") {
    return { ok: false, reason: "Detection runs in the browser", signals: [] };
  }
  const signals = [uaSignal(), jsApiSignal(), await headerSignal()];
  return summarise(signals);
}

/** Guidance shown whenever SEB is missing — installing it is not enough. */
export const SEB_BLOCK_MESSAGE = "This assessment can only be taken using Safe Exam Browser.";

export const SEB_GUIDANCE = [
  "Installing Safe Exam Browser is not enough on its own — the assessment must be opened through SEB.",
  "Download the exam's .seb configuration file from your department portal and open it; SEB launches and loads this page for you.",
  "Do not paste the exam link into Chrome, Edge, Firefox or Safari — those sessions can never be verified.",
  "SEB itself enforces operating-system lockdown (task switching, keyboard shortcuts, screen capture). A normal browser cannot provide that.",
];
