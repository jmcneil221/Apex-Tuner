import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { TuneList } from "@/components/TuneList";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/auth";
import { fetchTunes } from "@/lib/queries/tunes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatLapTime } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ username: string }>;
type SearchParams = Promise<{ page?: string }>;

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

type AggregateRow = { upvote_count: number; lap_time_ms: number | null };

export async function generateMetadata({ params }: { params: Params }) {
  const { username } = await params;
  return {
    title: `@${username} — ApexTuner`,
    description: `Garage and published tunes for @${username} on ApexTuner.`,
  };
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { username } = await params;
  const sp = await searchParams;
  const page = sp.page && /^\d+$/.test(sp.page) ? Math.max(1, Number(sp.page)) : 1;

  if (!isSupabaseConfigured()) notFound();

  const supabase = await createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, created_at")
    .ilike("username", username)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    return (
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="mx-auto w-full max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-rev-500/40 bg-rev-500/10 p-8 text-rev-200">
            <h1 className="text-xl font-semibold text-carbon-50">
              Couldn’t load profile
            </h1>
            <p className="mt-3 font-mono text-sm">{profileError.message}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) notFound();

  const currentUser = await getCurrentUser();
  const isMe = currentUser?.id === profile.id;

  // Hero stats: lifetime totals across the driver's PUBLIC tunes.
  // Pagination on the grid below would otherwise mean stats reflect
  // only the visible page, which would silently regress the page's
  // "career stats" feel. Run a separate aggregate fetch.
  const { data: aggregateRows } = await supabase
    .from("tunes")
    .select("upvote_count, lap_time_ms")
    .eq("author_id", profile.id)
    .eq("is_public", true);

  const aggregate = (aggregateRows ?? []) as AggregateRow[];
  const publicTuneCount = aggregate.length;
  const totalUpvotes = aggregate.reduce((s, r) => s + (r.upvote_count ?? 0), 0);
  const bestLap = aggregate
    .map((r) => r.lap_time_ms)
    .filter((v): v is number => typeof v === "number" && v > 0)
    .sort((a, b) => a - b)[0];

  // Grid: includes private tunes when the viewer is the owner (RLS
  // already enforces this). publicOnly=false defers to the policy:
  // tunes_select_public_or_author = (is_public OR auth.uid() = author_id).
  const gridResult = await fetchTunes({
    authorId: profile.id,
    page,
    publicOnly: !isMe,
  });

  const buildHref = (p: number) =>
    p > 1 ? `/profile/${profile.username}?page=${p}` : `/profile/${profile.username}`;

  const joined = new Date(profile.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  });
  const displayName = profile.display_name ?? profile.username;

  return (
    <div className="flex flex-1 flex-col">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <section className="rounded-2xl border border-carbon-800 bg-carbon-900/40 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-5 min-w-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-full ring-1 ring-carbon-700"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-carbon-800 font-mono text-lg text-carbon-200 ring-1 ring-carbon-700">
                  {(profile.username ?? "?").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-3xl font-semibold tracking-tight text-carbon-50">
                  {displayName}
                </h1>
                <p className="mt-0.5 text-sm text-carbon-400">
                  @{profile.username} · driver since {joined}
                </p>
                {profile.bio ? (
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-carbon-300">
                    {profile.bio}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-start gap-6 md:gap-8">
              <Stat label="Public tunes" value={publicTuneCount.toString()} />
              <Stat label="Upvotes" value={totalUpvotes.toString()} />
              <Stat
                label="Best lap"
                value={bestLap ? formatLapTime(bestLap) : "—"}
                accent="rev"
              />
            </div>
          </div>

          {isMe ? (
            <div className="mt-6 flex items-center justify-between border-t border-carbon-800 pt-4">
              <span className="text-xs uppercase tracking-[0.2em] text-apex-400">
                Your garage
              </span>
              <Link
                href="/tunes/new"
                className="inline-flex h-9 items-center justify-center rounded-full bg-apex-500 px-4 text-xs font-semibold text-carbon-950 shadow-apex transition hover:bg-apex-400"
              >
                Publish a tune
              </Link>
            </div>
          ) : null}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-carbon-50">
            Published tunes
            {isMe ? (
              <span className="ml-2 text-xs font-normal text-carbon-500">
                (including private)
              </span>
            ) : null}
          </h2>
          <TuneList
            result={gridResult}
            buildHref={buildHref}
            emptyTitle={
              isMe
                ? "You haven't published any tunes yet"
                : `@${profile.username} hasn't published any tunes yet`
            }
            emptyMessage={
              isMe ? (
                <Link href="/tunes/new" className="text-apex-300 hover:text-apex-200">
                  Publish your first tune →
                </Link>
              ) : null
            }
          />
        </section>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "rev";
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-[0.3em] text-carbon-500">
        {label}
      </span>
      <span
        className={[
          "mt-1 font-mono text-2xl font-semibold",
          accent === "rev" ? "text-rev-400" : "text-carbon-50",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
