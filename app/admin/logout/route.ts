import { NextResponse } from "next/server";

import { getAdminCookieName } from "@/admin/auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin", request.url));

  response.cookies.set({
    name: getAdminCookieName(),
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return response;
}
