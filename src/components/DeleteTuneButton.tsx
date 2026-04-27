"use client";

import { useTransition } from "react";
import { deleteTune } from "@/lib/actions/tunes";

export function DeleteTuneButton({ tuneId, title }: { tuneId: string; title: string }) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) {
      e.preventDefault();
      return;
    }
    const formData = new FormData(e.currentTarget);
    e.preventDefault();
    startTransition(() => {
      void deleteTune(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="tune_id" value={tuneId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-rev-500/40 bg-rev-500/10 px-4 py-2 text-xs font-semibold text-rev-200 transition hover:bg-rev-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
    </form>
  );
}
