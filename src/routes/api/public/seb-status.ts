import { createFileRoute } from "@tanstack/react-router";

/**
 * Safe Exam Browser header handshake.
 *
 * SEB attaches `X-SafeExamBrowser-RequestHash` and
 * `X-SafeExamBrowser-ConfigKeyHash` to every request it makes, and adds an
 * "SEB/<version>" token to the user agent. Browsers cannot read request headers
 * of their own navigation, so the exam flow asks this endpoint instead.
 *
 * Public on purpose: it only reports whether SEB headers were present.
 */
export const Route = createFileRoute("/api/public/seb-status")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const h = request.headers;
        const requestHash = Boolean(h.get("x-safeexambrowser-requesthash"));
        const configKeyHash = Boolean(h.get("x-safeexambrowser-configkeyhash"));
        const ua = h.get("user-agent") ?? "";
        const userAgentSeb = /SEB[\s/][\d.]+/i.test(ua) || /SafeExamBrowser/i.test(ua);

        return Response.json(
          {
            seb: requestHash || configKeyHash || userAgentSeb,
            requestHash,
            configKeyHash,
            userAgentSeb,
          },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
