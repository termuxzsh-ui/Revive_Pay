"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthFormState } from "@/app/actions/auth";

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const action = isSignUp ? signUp : signIn;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="mt-7 space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#d9ded7]">
          Email address
        </span>
        <input
          autoComplete="email"
          className="h-11 w-full rounded-lg border border-white/[0.1] bg-[#0a121a] px-3 text-sm outline-none transition placeholder:text-[#646f78] focus:border-[#13b9f3]"
          name="email"
          placeholder="you@company.com"
          required
          type="email"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#d9ded7]">
          Password
        </span>
        <input
          autoComplete={isSignUp ? "new-password" : "current-password"}
          className="h-11 w-full rounded-lg border border-white/[0.1] bg-[#0a121a] px-3 text-sm outline-none transition placeholder:text-[#646f78] focus:border-[#13b9f3]"
          minLength={8}
          name="password"
          placeholder="At least 8 characters"
          required
          type="password"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-[#ff9589]">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm text-[#9cdefa]">
          {state.success}
        </p>
      ) : null}
      <button
        className="flex h-11 w-full items-center justify-center rounded-lg bg-[#13b9f3] px-4 text-sm font-semibold text-[#06131b] transition hover:bg-[#38c8fa] disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending
          ? "Please wait..."
          : isSignUp
            ? "Create your account"
            : "Sign in"}
      </button>
      <p className="pt-1 text-center text-sm text-[#969d95]">
        {isSignUp ? "Already have an account?" : "New to RevivePay?"}{" "}
        <button
          className="font-medium text-[#8bdcff] hover:text-white"
          onClick={() => setIsSignUp((value) => !value)}
          type="button"
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </button>
      </p>
    </form>
  );
}
