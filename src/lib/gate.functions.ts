import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const requireUnlocked = createServerFn({ method: "GET" }).handler(
  async () => {
    const COOKIE_NAME = "site-gate";
    const MAX_AGE = 60 * 60 * 24 * 7; // 7 days
    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) throw new Error("SESSION_SECRET is not set");

    const isValidToken = (token: string | undefined): boolean => {
      if (!token) return false;
      const [payload, sig] = token.split(".");
      if (!payload || !sig) return false;
      const expected = createHmac("sha256", sessionSecret)
        .update(payload, "utf8")
        .digest("hex");
      const a = Buffer.from(sig, "hex");
      const b = Buffer.from(expected, "hex");
      if (a.length !== b.length) return false;
      if (!timingSafeEqual(a, b)) return false;
      const ts = Number(payload);
      if (!Number.isFinite(ts)) return false;
      if (Date.now() - ts > MAX_AGE * 1000) return false;
      return true;
    };

    const token = getCookie(COOKIE_NAME);
    if (!isValidToken(token)) {
      throw redirect({ to: "/unlock" });
    }
    return { ok: true as const };
  },
);

export const unlockSite = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => {
    if (typeof data?.password !== "string" || data.password.length > 512) {
      throw new Error("Invalid input");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const COOKIE_NAME = "site-gate";
    const MAX_AGE = 60 * 60 * 24 * 7; // 7 days
    const expected = process.env.SITE_PASSWORD;
    const sessionSecret = process.env.SESSION_SECRET;
    if (!expected) throw new Error("SITE_PASSWORD is not set");
    if (!sessionSecret) throw new Error("SESSION_SECRET is not set");

    const normalizePassword = (value: string) => value.trim().normalize("NFKC");
    const inputDigest = createHash("sha256")
      .update(normalizePassword(data.password), "utf8")
      .digest();
    const expectedDigest = createHash("sha256")
      .update(normalizePassword(expected), "utf8")
      .digest();
    if (!timingSafeEqual(inputDigest, expectedDigest)) {
      return { ok: false as const };
    }

    const payload = String(Date.now());
    const signature = createHmac("sha256", sessionSecret)
      .update(payload, "utf8")
      .digest("hex");

    setCookie(COOKIE_NAME, `${payload}.${signature}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MAX_AGE,
      path: "/",
    });
    return { ok: true as const };
  });

export const lockSite = createServerFn({ method: "POST" }).handler(async () => {
  const COOKIE_NAME = "site-gate";
  deleteCookie(COOKIE_NAME, { path: "/" });
  return { ok: true as const };
});
