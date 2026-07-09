import { createFileRoute } from "@tanstack/react-router";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const Route = createFileRoute("/api/public/unlock")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const COOKIE_NAME = "site-gate";
        const MAX_AGE = 60 * 60 * 24 * 7; // 7 days
        const expected = process.env.SITE_PASSWORD;
        const sessionSecret = process.env.SESSION_SECRET;
        const contentType = request.headers.get("content-type") ?? "";
        const wantsFormRedirect = !contentType.includes("application/json");

        if (!expected || !sessionSecret) {
          if (wantsFormRedirect) {
            return new Response(null, {
              status: 303,
              headers: { Location: "/unlock?error=1" },
            });
          }
          return Response.json({ ok: false, error: "not_configured" }, { status: 500 });
        }

        let password = "";
        try {
          if (contentType.includes("application/json")) {
            const body = (await request.json()) as { password?: unknown };
            password = typeof body.password === "string" ? body.password : "";
          } else {
            const formData = await request.formData();
            password = String(formData.get("password") ?? "");
          }
        } catch {
          if (wantsFormRedirect) {
            return new Response(null, {
              status: 303,
              headers: { Location: "/unlock?error=1" },
            });
          }
          return Response.json({ ok: false }, { status: 400 });
        }

        if (!password || password.length > 512) {
          if (wantsFormRedirect) {
            return new Response(null, {
              status: 303,
              headers: { Location: "/unlock?error=1" },
            });
          }
          return Response.json({ ok: false }, { status: 400 });
        }

        const normalizePassword = (value: string) => value.trim().normalize("NFKC");
        const inputDigest = createHash("sha256")
          .update(normalizePassword(password), "utf8")
          .digest();
        const expectedDigest = createHash("sha256")
          .update(normalizePassword(expected), "utf8")
          .digest();

        if (!timingSafeEqual(inputDigest, expectedDigest)) {
          if (wantsFormRedirect) {
            return new Response(null, {
              status: 303,
              headers: { Location: "/unlock?error=1" },
            });
          }
          return Response.json({ ok: false });
        }

        const payload = String(Date.now());
        const signature = createHmac("sha256", sessionSecret)
          .update(payload, "utf8")
          .digest("hex");
        const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
        const cookie = `${COOKIE_NAME}=${payload}.${signature}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${secure}`;

        if (wantsFormRedirect) {
          return new Response(null, {
            status: 303,
            headers: {
              Location: "/out-of-catalog",
              "Set-Cookie": cookie,
            },
          });
        }

        return Response.json(
          { ok: true },
          {
            headers: {
              "Set-Cookie": cookie,
            },
          },
        );
      },
    },
  },
});