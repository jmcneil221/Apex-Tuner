import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatLapTime, type TuneWithRelations } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

async function fetchTopTunes(): Promise<TuneWithRelations[]> {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return [];
    }

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
          created_at,
          updated_at,
          cars ( make, model, year, drivetrain, category ),
          tracks ( name, layout ),
          profiles ( username, display_name )
        `,
      )
      .eq("is_public", true)
      .order("upvote_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      console.warn("[apextuner] tunes query failed:", error.message);
      return [];
    }
    return (data ?? []) as unknown as TuneWithRelations[];
  } catch (err) {
    console.warn("[apextuner] supabase unavailable:", err);
    return [];
  }
}

export default async function Home() {
  const tunes = await fetchTopTunes();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-carbon-800/80 bg-carbon-950/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-md bg-carbon-900 ring-1 ring-apex-500/40">
              <span className="absolute inset-0 rounded-md bg-apex-500/10 blur-md" />
              <span className="relative font-mono text-sm font-bold text-apex-300">
                AT
              </span>
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-[0.2em] text-carbon-200">
                APEXTUNER
              </span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-apex-400/80">
                GT7 Telemetry · Tuning
              </span>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-carbon-300 sm:flex">
            <Link className="hover:text-apex-300" href="/tunes">
              Tunes
            </Link>
            <Link className="hover:text-apex-300" href="/cars">
              Cars
            </Link>
            <Link className="hover:text-apex-300" href="/tracks">
              Tracks
            </Link>
            <Link
              className="rounded-full border border-apex-500/40 bg-apex-500/10 px-4 py-1.5 text-apex-200 transition hover:bg-apex-500/20"
              href="/login"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

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
                value={
                  tunes.find((t) => t.lap_time_ms)
                    ? formatLapTime(
                        tunes
                          .map((t) => t.lap_time_ms)
                          .filter((v): v is number => typeof v === "number")
                          .sort((a, b) => a - b)[0]!,
                      )
                    : "—"
                }
              />
              <Stat
                label="Upvotes"
                value={tunes
                  .reduce((sum, t) => sum + (t.upvote_count ?? 0), 0)
                  .toString()}
              />
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
            {tunes.length === 0 ? (
              <EmptyState />
            ) : (
              tunes.map((tune) => <TuneCard key={tune.id} tune={tune} />)
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

function TuneCard({ tune }: { tune: TuneWithRelations }) {
  const car = tune.cars
    ? `${tune.cars.year} ${tune.cars.make} ${tune.cars.model}`
    : "Unknown car";
  const track = tune.tracks
    ? `${tune.tracks.name} — ${tune.tracks.layout}`
    : null;
  const author =
    tune.profiles?.display_name ?? tune.profiles?.username ?? "anonymous";

  return (
    <article className="group flex flex-col rounded-xl border border-carbon-800 bg-carbon-900/50 p-5 transition hover:border-apex-500/40 hover:bg-carbon-900/80">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-carbon-50 group-hover:text-apex-200">
            {tune.title}
          </h3>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-carbon-400">
            {car}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-carbon-700 bg-carbon-950 px-2.5 py-1 text-xs font-medium text-apex-300">
          <span className="text-apex-400">▲</span>
          {tune.upvote_count}
        </div>
      </header>
      {tune.description ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-carbon-300">
          {tune.description}
        </p>
      ) : null}
      <footer className="mt-4 flex items-center justify-between border-t border-carbon-800 pt-3 text-xs text-carbon-400">
        <span className="truncate">{track ?? "Any track"}</span>
        <span className="flex items-center gap-3">
          <span className="font-mono text-rev-400">
            {formatLapTime(tune.lap_time_ms)}
          </span>
          <span className="text-carbon-500">@{author}</span>
        </span>
      </footer>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-carbon-800 bg-carbon-900/30 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-apex-500/10 text-apex-300 ring-1 ring-apex-500/30">
        <span className="text-xl">◎</span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-carbon-100">
        No tunes yet
      </h3>
      <p className="mt-2 max-w-md text-sm text-carbon-400">
        Once Supabase is connected and the first migration is applied, your
        community tunes will appear here. Set{" "}
        <code className="rounded bg-carbon-950 px-1.5 py-0.5 font-mono text-[11px] text-apex-300">
          NEXT_PUBLIC_SUPABASE_URL
        </code>{" "}
        and{" "}
        <code className="rounded bg-carbon-950 px-1.5 py-0.5 font-mono text-[11px] text-apex-300">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </code>{" "}
        in <code className="font-mono text-[11px]">.env.local</code>.
      </p>
    </div>
  );
}
