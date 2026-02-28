import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { env } from "@/lib/env";

const ADMIN_SESSION_COOKIE = "admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

type AdminConfig = {
  id: string;
  password: string;
  sessionSecret: string;
};

function getAdminConfig(): AdminConfig | null {
  if (!env.ADMIN_ID || !env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) {
    return null;
  }

  return {
    id: env.ADMIN_ID,
    password: env.ADMIN_PASSWORD,
    sessionSecret: env.ADMIN_SESSION_SECRET
  };
}

function safeEqualText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function isAdminConfigured(): boolean {
  return getAdminConfig() !== null;
}

export function createAdminSessionValue(adminId: string): string | null {
  const config = getAdminConfig();

  if (!config) {
    return null;
  }

  const payload = `${adminId}:${Date.now()}`;
  const signature = signPayload(payload, config.sessionSecret);
  return `${payload}.${signature}`;
}

export function isValidAdminLogin(id: string, password: string): boolean {
  const config = getAdminConfig();

  if (!config) {
    return false;
  }

  return safeEqualText(id, config.id) && safeEqualText(password, config.password);
}

export function isAdminSessionValid(sessionValue: string | undefined): boolean {
  const config = getAdminConfig();

  if (!config || !sessionValue) {
    return false;
  }

  const separatorIndex = sessionValue.lastIndexOf(".");
  if (separatorIndex <= 0 || separatorIndex >= sessionValue.length - 1) {
    return false;
  }

  const payload = sessionValue.slice(0, separatorIndex);
  const providedSignature = sessionValue.slice(separatorIndex + 1);

  const expectedSignature = signPayload(payload, config.sessionSecret);
  if (!safeEqualText(providedSignature, expectedSignature)) {
    return false;
  }

  const [sessionId, issuedAtRaw] = payload.split(":");
  if (!sessionId || !issuedAtRaw) {
    return false;
  }

  if (!safeEqualText(sessionId, config.id)) {
    return false;
  }

  const issuedAt = Number.parseInt(issuedAtRaw, 10);
  if (Number.isNaN(issuedAt)) {
    return false;
  }

  return Date.now() - issuedAt <= ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
}

export function getAdminCookieName(): string {
  return ADMIN_SESSION_COOKIE;
}

export function getAdminSessionMaxAgeSeconds(): number {
  return ADMIN_SESSION_MAX_AGE_SECONDS;
}

export function getAdminSessionFromCookies(): string | undefined {
  return cookies().get(ADMIN_SESSION_COOKIE)?.value;
}
