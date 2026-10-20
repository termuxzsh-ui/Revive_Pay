import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuthForm from "./auth-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export const instant = false;

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { checkEmail } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080f16] px-5 py-12 text-[#eef4f7]">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="mb-10 flex items-center gap-3">
          <Image
            alt="RevivePay shield logo"
            className="size-12 rounded-xl border border-white/10 object-cover"
            height={48}
            priority
            src="/revivepay-logo.jpg"
            width={48}
          />
          <span className="text-lg font-semibold tracking-tight">RevivePay</span>
        </Link>
        <div className="rounded-2xl border border-white/[0.08] bg-[#101b25] p-7 shadow-2xl sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#55cafa]">
            Welcome to RevivePay
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Keep revenue in motion.
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#969d95]">
            Sign in to your account or create one to get started.
          </p>
          {checkEmail ? (
            <p className="mt-5 rounded-lg border border-[#17415a] bg-[#102534] px-4 py-3 text-sm leading-6 text-[#9cdefa]">
              Check your inbox to confirm your email address before signing in.
            </p>
          ) : null}
          <AuthForm />
        </div>
        <p className="mt-6 text-center text-xs text-[#737a73]">
          Secure payment recovery, built for subscription teams.
        </p>
      </div>
    </main>
  );
}
