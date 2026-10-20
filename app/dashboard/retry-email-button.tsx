"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

export default function RetryEmailButton({ invoiceId }: { invoiceId: string }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function retryEmail() {
    setSending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/retry`, {
        method: "POST",
      });
      const result = (await response.json()) as { error?: string; sent?: boolean };
      if (!response.ok) {
        throw new Error(result.error || "Could not send the retry email.");
      }
      setMessage("Email sent");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not send the retry email.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        aria-label="Send payment reminder"
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-[#121e28] px-3 text-xs font-medium text-[#dbe5eb] transition hover:border-[#1688b4] hover:text-[#8bdcff] disabled:cursor-wait disabled:opacity-60"
        disabled={sending}
        onClick={retryEmail}
        type="button"
      >
        <Mail aria-hidden="true" size={14} />
        {sending ? "Sending..." : "Retry email"}
      </button>
      {message ? (
        <span
          aria-live="polite"
          className={`max-w-40 text-right text-[11px] ${message === "Email sent" ? "text-[#8bdcff]" : "text-[#ff9589]"}`}
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}
