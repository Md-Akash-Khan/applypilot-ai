import { NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "");
  const password = String(form.get("password") || "");
  const user = await login(email, password);
  if (!user) return NextResponse.redirect(new URL("/login?error=1", request.url), { status: 303 });
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
