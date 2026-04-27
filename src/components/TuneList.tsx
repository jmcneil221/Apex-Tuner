import Link from "next/link";
import { TuneCard } from "@/components/TuneCard";
import type { FetchTunesResult } from "@/lib/queries/tunes";

type Props = {
  result: FetchTunesResult;
  buildHref: (page: number) => string;
  emptyTitle?: string;
  emptyMessage?: React.ReactNode;
};

export function TuneList({
  result,
  buildHref,
  emptyTitle = "No tunes published yet",
  emptyMessage,
}: Props) {
  if (result.status === "not-configured") {
    return (
      <Notice tone="info" title="Supabase not configured">
        Set <Code>NEXT_PUBLIC_SUPABASE_URL</Code> and{" "}
        <Code>NEXT_PUBLIC_SUPABASE_ANON_KEY</Code> in <Code>.env.local</Code>.
      </Notice>
    );
  }

  if (result.status === "error") {
    return (
      <Notice tone="error" title="Couldn’t load tunes">
        <span className="font-mono">{result.message}</span>
      </Notice>
    );
  }

  if (result.tunes.length === 0) {
    return (
      <Notice tone="info" title={emptyTitle}>
        {emptyMessage ?? (
          <>
            Be the first —{" "}
            <Link href="/tunes/new" className="text-apex-300 hover:text-apex-200">
              publish a tune
            </Link>
            .
          </>
        )}
      </Notice>
    );
  }

  const { tunes, total, page, pageSize } = result;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <>
      <div className="mt-6 text-xs text-carbon-500">
        Showing {startIdx}–{endIdx} of {total}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tunes.map((tune) => (
          <TuneCard key={tune.id} tune={tune} />
        ))}
      </div>
      {totalPages > 1 ? (
        <nav className="mt-8 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={buildHref(page - 1)}
              className="rounded-full border border-carbon-700 bg-carbon-900/60 px-4 py-2 text-carbon-200 hover:border-apex-500/40 hover:text-apex-200"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="font-mono text-xs text-carbon-500">
            Page {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={buildHref(page + 1)}
              className="rounded-full border border-carbon-700 bg-carbon-900/60 px-4 py-2 text-carbon-200 hover:border-apex-500/40 hover:text-apex-200"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: "info" | "error";
  title: string;
  children: React.ReactNode;
}) {
  const accent =
    tone === "error"
      ? "border-rev-500/40 bg-rev-500/10 text-rev-200"
      : "border-carbon-800 bg-carbon-900/40 text-carbon-300";
  return (
    <div className={`mt-8 rounded-xl border p-6 ${accent}`}>
      <h2 className="text-base font-semibold text-carbon-50">{title}</h2>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-carbon-950 px-1.5 py-0.5 font-mono text-[11px] text-apex-300">
      {children}
    </code>
  );
}
