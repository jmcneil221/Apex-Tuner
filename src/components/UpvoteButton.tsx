"use client";

import { useOptimistic } from "react";
import { toggleUpvote } from "@/lib/actions/votes";

type Props = {
  tuneId: string;
  count: number;
  voted: boolean;
  signedIn: boolean;
};

type State = { count: number; voted: boolean };

export function UpvoteButton({ tuneId, count, voted, signedIn }: Props) {
  const [optimistic, applyOptimistic] = useOptimistic<State, void>(
    { count, voted },
    (state) => ({
      count: state.voted ? Math.max(0, state.count - 1) : state.count + 1,
      voted: !state.voted,
    }),
  );

  async function action(formData: FormData) {
    applyOptimistic();
    await toggleUpvote(formData);
  }

  const label = !signedIn
    ? "Sign in to upvote"
    : optimistic.voted
      ? "Upvoted"
      : "Upvote";

  return (
    <form action={action} className="inline-flex">
      <input type="hidden" name="tune_id" value={tuneId} />
      <button
        type="submit"
        aria-pressed={optimistic.voted}
        aria-label={`${label} — ${optimistic.count} upvote${optimistic.count === 1 ? "" : "s"}`}
        className={[
          "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
          optimistic.voted
            ? "border-apex-500 bg-apex-500 text-carbon-950 shadow-apex hover:bg-apex-400"
            : "border-carbon-700 bg-carbon-900/60 text-carbon-100 hover:border-apex-500/60 hover:text-apex-200",
        ].join(" ")}
      >
        <span
          className={[
            "text-base leading-none transition",
            optimistic.voted
              ? "text-carbon-950"
              : "text-apex-400 group-hover:text-apex-300",
          ].join(" ")}
          aria-hidden="true"
        >
          ▲
        </span>
        <span>{label}</span>
        <span
          className={[
            "ml-1 rounded-full px-2 py-0.5 font-mono text-xs tabular-nums",
            optimistic.voted
              ? "bg-carbon-950/30 text-carbon-950"
              : "bg-carbon-950 text-apex-300",
          ].join(" ")}
        >
          {optimistic.count}
        </span>
      </button>
    </form>
  );
}
