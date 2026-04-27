import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { SetupSheet } from "@/components/SetupSheet";
import { UpvoteButton } from "@/components/UpvoteButton";
import { isSupabaseConfigured } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  formatLapTime,
  type TuneWithRelations,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LoadResult =
  | { status: "not-configured" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      tune: TuneWithRelations;
      voted: boolean;
      signedIn: boolean;
    };

async function loadTune(id: string): Promise<LoadResult> {
  if (!isSupabaseConfigured()) return { status: "not-configured" };
  if (!UUID_RE.test(id)) return { status: "not-found" };

  try {
    const supabase = await createSupabaseServerClient();
    const [tuneResp, userResp] = await Promise.all([
      supabase
        .from("tunes")
        .select(
          `
            id, author_id, car_id, track_id,
            title, description, setup,
            lap_time_ms, upvote_count, is_public,
            created_at, updated_at,
            cars ( make, model, year, drivetrain, category ),
            tracks ( name, layout, country ),
            profiles ( username, display_name, avatar_url )
          `,
        )
        .eq("id", id)
        .maybeSingle(),
      supabase.auth.getUser(),
    ]);

    if (tuneResp.error) {
      return { status: "error", message: tuneResp.error.message };
    }
    if (!tuneResp.data) return { status: "not-found" };

    const tune = tuneResp.data as unknown as TuneWithRelations;
    const user = userResp.data.user;
    let voted = false;

    if (user) {
      const { data: vote } = await supabase
        .from("tune_votes")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("tune_id", tune.id)
        .maybeSingle();
      voted = Boolean(vote);
    }

    return { status: "ok", tune, voted, signedIn: Boolean(user) };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "unknown error",
    };
  }
}

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const result = await loadTune(id);
  if (result.status !== "ok") return { title: "Tune — ApexTuner" };
  const car = result.tune.cars
    ? `${result.tune.cars.year} ${result.tune.cars.make} ${result.tune.cars.model}`
    : "Tune";
  return {
    title: `${result.tune.title} · ${car} — ApexTuner`,
    description:
      result.tune.description ?? `GT7 setup sheet for ${car} on ApexTuner.`,
  };
}

export default async function TuneDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const result = await loadTune(id);

  if (result.status === "not-found") {
    notFound();
  }

  if (result.status === "not-configured") {
    return (
      <div className="flex flex-1 flex-col">
        <Header />
        <ErrorPanel
          title="Supabase not configured"
          tone="info"
          message="Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local."
        />
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="flex flex-1 flex-col">
        <Header />
        <ErrorPanel
          title="Couldn’t load this tune"
          tone="error"
          message={result.message}
        />
      </div>
    );
  }

  const { tune, voted, signedIn } = result;
  const car = tune.cars
    ? `${tune.cars.year} ${tune.cars.make} ${tune.cars.model}`
    : "Unknown car";
  const trackLabel = tune.tracks
    ? `${tune.tracks.name} — ${tune.tracks.layout}`
    : "Any track";
  const author =
    tune.profiles?.display_name ?? tune.profiles?.username ?? "anonymous";
  const username = tune.profiles?.username;
  const created = new Date(tune.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-1 flex-col">
      <Header />

      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-carbon-400 hover:text-apex-300"
        >
          ← Back to leaderboard
        </Link>

        <section className="rounded-2xl border border-carbon-800 bg-carbon-900/40 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {tune.cars?.category ? (
                  <span className="rounded-full border border-apex-500/30 bg-apex-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-apex-200">
                    {tune.cars.category}
                  </span>
                ) : null}
                {tune.cars?.drivetrain ? (
                  <span className="rounded-full border border-carbon-700 bg-carbon-950 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-carbon-300">
                    {tune.cars.drivetrain}
                  </span>
                ) : null}
                {!tune.is_public ? (
                  <span className="rounded-full border border-rev-500/40 bg-rev-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-rev-300">
                    Private
                  </span>
                ) : null}
              </div>

              <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-carbon-50 md:text-4xl">
                {tune.title}
              </h1>
              <p className="mt-2 text-base text-carbon-300">{car}</p>
              <p className="mt-1 text-sm text-carbon-400">
                {trackLabel}
                {tune.tracks?.country ? ` · ${tune.tracks.country}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-4 md:items-end">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.3em] text-carbon-500">
                  Best lap
                </div>
                <div className="font-mono text-3xl font-semibold text-rev-400">
                  {formatLapTime(tune.lap_time_ms)}
                </div>
              </div>
              <UpvoteButton
                tuneId={tune.id}
                count={tune.upvote_count}
                voted={voted}
                signedIn={signedIn}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-carbon-800 pt-4 text-xs text-carbon-500">
            <span>
              by{" "}
              {username ? (
                <Link
                  href={`/profile/${username}`}
                  className="text-carbon-200 hover:text-apex-300"
                >
                  @{username}
                </Link>
              ) : (
                <span className="text-carbon-200">{author}</span>
              )}
            </span>
            <span>Published {created}</span>
          </div>
        </section>

        {tune.description ? (
          <section className="mt-6 rounded-2xl border border-carbon-800 bg-carbon-900/40 p-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-apex-300">
              Driver notes
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-carbon-200">
              {tune.description}
            </p>
          </section>
        ) : null}

        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-carbon-400">
            Setup sheet
          </h2>
          <SetupSheet setup={tune.setup} />
        </section>

        <details className="mt-8 rounded-xl border border-carbon-800 bg-carbon-950/60">
          <summary className="cursor-pointer px-5 py-3 text-xs font-medium uppercase tracking-[0.25em] text-carbon-400 hover:text-apex-300">
            Raw setup JSON
          </summary>
          <pre className="overflow-x-auto border-t border-carbon-800 px-5 py-4 font-mono text-[11px] leading-relaxed text-carbon-300">
            {JSON.stringify(tune.setup, null, 2)}
          </pre>
        </details>
      </main>
    </div>
  );
}

function ErrorPanel({
  title,
  message,
  tone,
}: {
  title: string;
  message: string;
  tone: "info" | "error";
}) {
  const accent =
    tone === "error"
      ? "border-rev-500/40 bg-rev-500/10 text-rev-200"
      : "border-carbon-800 bg-carbon-900/40 text-carbon-200";
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <div className={`rounded-2xl border ${accent} p-8`}>
        <h1 className="text-xl font-semibold text-carbon-50">{title}</h1>
        <p className="mt-3 font-mono text-sm">{message}</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-apex-300 hover:text-apex-200"
        >
          ← Back home
        </Link>
      </div>
    </main>
  );
}
