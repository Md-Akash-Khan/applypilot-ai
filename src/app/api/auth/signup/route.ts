import { NextResponse } from "next/server";
import { z } from "zod";
import { register } from "@/lib/auth";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(128)
});

export async function POST(request: Request) {
  const form = await request.formData();
  const parsed = signupSchema.safeParse({
    name: String(form.get("name") || ""),
    email: String(form.get("email") || ""),
    password: String(form.get("password") || "")
  });
  if (!parsed.success) return NextResponse.redirect(new URL("/signup?error=invalid", request.url), { status: 303 });

  try {
    const user = await register(parsed.data.name, parsed.data.email, parsed.data.password);
    if (!user) return NextResponse.redirect(new URL("/signup?error=exists", request.url), { status: 303 });
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  } catch {
    return NextResponse.redirect(new URL("/signup?error=unavailable", request.url), { status: 303 });
  }
}

