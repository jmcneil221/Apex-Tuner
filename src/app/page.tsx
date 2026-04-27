import Link from "next/link";
import { Header } from "@/components/Header";
import { TuneCard } from "@/components/TuneCard";
import { isSupabaseConfigured } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatLapTime, type TuneWithRelations } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type FeedResult =
  | { status: "not-configured" }
  | { status: "error"; message: string }
  | { status: "ok"; tunes: TuneWithRelations[] };

async function fetchTopTunes(): Promise<FeedResult> {
  if (!isSupabaseConfigured()) {
    return { status: "not-configured" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tunes")
      .select(
        `
          id,
          author_id,
          car_id,
          track_id,
          title,
          description,
          setup,
          lap_time_ms,
          upvote_count,
          is_public,
          power_hp,
          weight_kg,
          pp_total,
          is_validated,
          created_at,
          updated_at,
          cars ( make, model, year, drivetrain, category ),
          tracks ( name, layout ),
          profiles!tunes_author_id_fkey ( username, display_name ),
          forked_from:tunes!forked_from_id (
            id,
            title,
            profiles!tunes_author_id_fkey ( username, display_name )
          )
        `,
      )
      .eq("is_public", true)
      .order("upvote_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      console.warn("[apextuner] tunes query failed:", error.message);
      return { status: "error", message: error.message };
    }

    return {
      status: "ok",
      tunes: (data ?? []) as unknown as TuneWithRelations[],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.warn("[apextuner] supabase unavailable:", message);
    return { status: "error", message };
  }
}

export default async function Home() {
  const feed = await fetchTopTunes();
  const tunes = feed.status === "ok" ? feed.tunes : [];

  const bestLapMs = tunes
    .map((t) => t.lap_time_ms)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b)[0];

  const totalUpvotes = tunes.reduce(
    (sum, t) => sum + (t.upvote_count ?? 0),
    0,
  );

  return (
    <div className="flex flex-1 flex-col">
      <Header />

      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden border-b border-carbon-800/80">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(26,216,245,0.12)_0%,transparent_45%,rgba(255,31,61,0.10)_100%)]" />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-24 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-apex-500/30 bg-apex-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-apex-200">
                <span className="h-1.5 w-1.5 rounded-full bg-apex-400 shadow-[0_0_12px_2px_rgba(26,216,245,0.7)]" />
                Built for Gran Turismo 7
              </span>
              <h1 className="mt-6 text-balance text-5xl font-semibold leading-tight tracking-tight text-carbon-50 sm:text-6xl">
                Find the <span className="text-apex-400">apex</span>.
                <br />
                Share the <span className="text-rev-500">setup</span>.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-carbon-300">
                ApexTuner is a tuning and telemetry platform for GT7 drivers.
                Upload your setup sheet, log laps, compare against the
                community, and chase the perfect line.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/tunes/new"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-apex-500 px-6 text-sm font-semibold text-carbon-950 shadow-apex transition hover:bg-apex-400"
                >
                  Publish a tune
                </Link>
                <Link
                  href="/tunes"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-carbon-700 bg-carbon-900/60 px-6 text-sm font-semibold text-carbon-100 transition hover:border-apex-500/50 hover:text-apex-200"
                >
                  Browse the leaderboard
                </Link>
              </div>
            </div>

            <dl className="grid w-full max-w-md grid-cols-3 gap-4 rounded-2xl border border-carbon-800 bg-carbon-900/40 p-6 backdrop-blur">
              <Stat label="Tunes" value={tunes.length.toString()} />
              <Stat
                label="Best lap"
                value={bestLapMs ? formatLapTime(bestLapMs) : "—"}
              />
              <Stat label="Upvotes" value={totalUpvotes.toString()} />
            </dl>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-carbon-50">
                Top community tunes
              </h2>
              <p className="mt-1 text-sm text-carbon-400">
                Sorted by upvotes from the ApexTuner community.
              </p>
            </div>
            <Link
              href="/tunes"
              className="text-sm font-medium text-apex-300 hover:text-apex-200"
            >
              View all →
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {feed.status === "ok" && feed.tunes.length > 0 ? (
              feed.tunes.map((tune) => <TuneCard key={tune.id} tune={tune} />)
            ) : (
              <FeedFallback feed={feed} />
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-carbon-800/80 bg-carbon-950/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-carbon-500 sm:flex-row">
          <span>© {new Date().getFullYear()} ApexTuner</span>
          <span className="font-mono">
            Not affiliated with Sony Interactive Entertainment or Polyphony Digital.
          </span>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-carbon-400">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-2xl font-semibold text-carbon-50">
        {value}
      </dd>
    </div>
  );
}

function FeedFallback({ feed }: { feed: FeedResult }) {
  if (feed.status === "not-configured") {
    return (
      <Fallback tone="info" title="Supabase not configured">
        Set{" "}
        <Code>NEXT_PUBLIC_SUPABASE_URL</Code> and{" "}
        <Code>NEXT_PUBLIC_SUPABASE_ANON_KEY</Code> in{" "}
        <Code>.env.local</Code>, then apply the migration and seed.
      </Fallback>
    );
  }

  if (feed.status === "error") {
    return (
      <Fallback tone="error" title="Couldn’t load tunes">
        The leaderboard query failed. Most likely cause: an RLS policy or a
        connectivity issue between the Next.js server and Supabase. Check the
        server logs for the full error.
        <span className="mt-3 block rounded-md border border-rev-500/30 bg-rev-500/5 px-3 py-2 font-mono text-[11px] text-rev-200">
          {feed.message}
        </span>
      </Fallback>
    );
  }

  return (
    <Fallback tone="info" title="No tunes published yet">
      Cars and tracks come from the seed data; the leaderboard fills up as the
      community publishes tunes.
      <Link
        href="/tunes/new"
        className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-apex-500 px-5 text-sm font-semibold text-carbon-950 shadow-apex transition hover:bg-apex-400"
      >
        Publish the first tune
      </Link>
    </Fallback>
  );
}

function Fallback({
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
      ? "border-rev-500/40 bg-rev-500/10 text-rev-300 ring-rev-500/30"
      : "border-carbon-800 bg-apex-500/10 text-apex-300 ring-apex-500/30";
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-carbon-800 bg-carbon-900/30 px-6 py-16 text-center">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ring-1 ${accent}`}
      >
        <span className="text-xl">{tone === "error" ? "⚠" : "◎"}</span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-carbon-100">{title}</h3>
      <div className="mt-2 max-w-md text-sm text-carbon-400">{children}</div>
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
