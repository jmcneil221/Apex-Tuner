import Link from "next/link";
import { Header } from "@/components/Header";
import { isSupabaseConfigured } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Track = {
  id: string;
  name: string;
  layout: string;
  country: string | null;
};

async function loadTracks(): Promise<{
  configured: boolean;
  error: string | null;
  tracks: Track[];
  countsByTrackId: Map<string, number>;
}> {
  if (!isSupabaseConfigured()) {
    return { configured: false, error: null, tracks: [], countsByTrackId: new Map() };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const [tracksResp, countsResp] = await Promise.all([
      supabase
        .from("tracks")
        .select("id, name, layout, country")
        .order("country", { nullsFirst: false })
        .order("name"),
      supabase.from("tunes").select("track_id").eq("is_public", true).not("track_id", "is", null),
    ]);

    if (tracksResp.error) {
      return {
        configured: true,
        error: tracksResp.error.message,
        tracks: [],
        countsByTrackId: new Map(),
      };
    }

    const counts = new Map<string, number>();
    for (const row of countsResp.data ?? []) {
      const id = (row as { track_id: string | null }).track_id;
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    return {
      configured: true,
      error: null,
      tracks: (tracksResp.data ?? []) as Track[],
      countsByTrackId: counts,
    };
  } catch (err) {
    return {
      configured: true,
      error: err instanceof Error ? err.message : "unknown error",
      tracks: [],
      countsByTrackId: new Map(),
    };
  }
}

export default async function TracksPage() {
  const { configured, error, tracks, countsByTrackId } = await loadTracks();

  const grouped = new Map<string, Track[]>();
  for (const track of tracks) {
    const key = track.country ?? "Unknown";
    const list = grouped.get(key);
    if (list) list.push(track);
    else grouped.set(key, [track]);
  }
  const countries = [...grouped.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="mb-8">
          <span className="text-xs uppercase tracking-[0.3em] text-apex-400">
            Atlas
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-carbon-50">
            Tracks
          </h1>
          <p className="mt-2 max-w-xl text-sm text-carbon-400">
            Every circuit ApexTuner knows. Click into any layout to see its
            published tunes.
          </p>
        </div>

        {!configured ? (
          <Notice tone="info" title="Supabase not configured">
            Set the env vars in <code className="font-mono">.env.local</code>.
          </Notice>
        ) : error ? (
          <Notice tone="error" title="Couldn’t load tracks">
            <span className="font-mono">{error}</span>
          </Notice>
        ) : tracks.length === 0 ? (
          <Notice tone="info" title="No tracks in the catalog yet">
            Apply <code className="font-mono">supabase/seed.sql</code> to populate.
          </Notice>
        ) : (
          <div className="space-y-10">
            {countries.map((country) => (
              <section key={country}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-apex-300">
                  {country}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped.get(country)!.map((track) => (
                    <TrackCardLink
                      key={track.id}
                      track={track}
                      tuneCount={countsByTrackId.get(track.id) ?? 0}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TrackCardLink({ track, tuneCount }: { track: Track; tuneCount: number }) {
  return (
    <Link
      href={`/tracks/${track.id}`}
      className="group block rounded-xl border border-carbon-800 bg-carbon-900/50 p-4 transition hover:border-apex-500/40 hover:bg-carbon-900/80"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-carbon-50 group-hover:text-apex-200">
            {track.name}
          </h3>
          <p className="mt-0.5 truncate text-xs uppercase tracking-wider text-carbon-400">
            {track.layout}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full border border-carbon-700 bg-carbon-950 px-2.5 py-1 font-mono text-xs text-carbon-200"
          title={`${tuneCount} published tune${tuneCount === 1 ? "" : "s"}`}
        >
          {tuneCount}
        </span>
      </div>
    </Link>
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
    <div className={`rounded-xl border p-6 ${accent}`}>
      <h2 className="text-base font-semibold text-carbon-50">{title}</h2>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  );
}
