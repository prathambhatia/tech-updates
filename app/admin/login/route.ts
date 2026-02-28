import { NextResponse } from "next/server";

import {
  createAdminSessionValue,
  getAdminCookieName,
  getAdminSessionMaxAgeSeconds,
  isAdminConfigured,
  isValidAdminLogin
} from "@/admin/auth";

export async function POST(request: Request) {
  const loginUrl = new URL("/admin", request.url);

  if (!isAdminConfigured()) {
    loginUrl.searchParams.set("error", "config");
    return NextResponse.redirect(loginUrl);
  }

  const formData = await request.formData();
  const id = String(formData.get("id") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!isValidAdminLogin(id, password)) {
    loginUrl.searchParams.set("error", "invalid");
    return NextResponse.redirect(loginUrl);
  }

  const sessionValue = createAdminSessionValue(id);
  if (!sessionValue) {
    loginUrl.searchParams.set("error", "config");
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.redirect(new URL("/admin", request.url));
  response.cookies.set({
    name: getAdminCookieName(),
    value: sessionValue,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getAdminSessionMaxAgeSeconds()
  });

  return response;
}
