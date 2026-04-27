import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { TuneList } from "@/components/TuneList";
import { isSupabaseConfigured } from "@/lib/auth";
import { fetchTunes } from "@/lib/queries/tunes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ page?: string }>;

type TrackRow = {
  id: string;
  name: string;
  layout: string;
  country: string | null;
};

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  if (!UUID_RE.test(id) || !isSupabaseConfigured()) {
    return { title: "Track — ApexTuner" };
  }
  const supabase = await createSupabaseServerClient();
  const { data: track } = await supabase
    .from("tracks")
    .select("name, layout")
    .eq("id", id)
    .maybeSingle<{ name: string; layout: string }>();
  if (!track) return { title: "Track — ApexTuner" };
  return {
    title: `${track.name} · ${track.layout} — ApexTuner`,
    description: `Published tunes for ${track.name} (${track.layout}) on ApexTuner.`,
  };
}

export default async function TrackDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = sp.page && /^\d+$/.test(sp.page) ? Math.max(1, Number(sp.page)) : 1;

  if (!UUID_RE.test(id)) notFound();
  if (!isSupabaseConfigured()) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: track, error: trackError } = await supabase
    .from("tracks")
    .select("id, name, layout, country")
    .eq("id", id)
    .maybeSingle<TrackRow>();

  if (trackError) {
    return <ErrorView title="Couldn’t load this track" message={trackError.message} />;
  }
  if (!track) notFound();

  const result = await fetchTunes({ trackId: id, page });
  const buildHref = (p: number) => (p > 1 ? `/tracks/${id}?page=${p}` : `/tracks/${id}`);

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <Link
          href="/tracks"
          className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-carbon-400 hover:text-apex-300"
        >
          ← All tracks
        </Link>

        <section className="rounded-2xl border border-carbon-800 bg-carbon-900/40 p-6 md:p-8">
          {track.country ? (
            <span className="text-xs uppercase tracking-[0.3em] text-apex-400">
              {track.country}
            </span>
          ) : null}
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-carbon-50 md:text-4xl">
            {track.name}
          </h1>
          <p className="mt-1 text-base text-carbon-300">{track.layout}</p>
          <p className="mt-2 text-sm text-carbon-400">
            {result.status === "ok" ? result.total : 0} published tune
            {result.status === "ok" && result.total === 1 ? "" : "s"}
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-carbon-50">Tunes</h2>
          <TuneList
            result={result}
            buildHref={buildHref}
            emptyTitle="No published tunes for this track yet"
            emptyMessage={
              <>
                First lap?{" "}
                <Link href="/tunes/new" className="text-apex-300 hover:text-apex-200">
                  Publish a tune
                </Link>
                .
              </>
            }
          />
        </section>
      </main>
    </div>
  );
}

function ErrorView({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-rev-500/40 bg-rev-500/10 p-8 text-rev-200">
          <h1 className="text-xl font-semibold text-carbon-50">{title}</h1>
          <p className="mt-3 font-mono text-sm">{message}</p>
        </div>
      </main>
    </div>
  );
}
