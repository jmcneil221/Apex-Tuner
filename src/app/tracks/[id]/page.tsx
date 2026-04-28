import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { TuneList } from "@/components/TuneList";
import { isSupabaseConfigured } from "@/lib/auth";
import { fetchTunes } from "@/lib/queries/tunes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CarCategory, DrivetrainKind } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CATEGORIES: CarCategory[] = [
  "N100", "N200", "N300", "N400", "N500",
  "N600", "N700", "N800", "N900", "N1000",
  "Gr.4", "Gr.3", "Gr.2", "Gr.1", "Gr.B", "Gr.X",
];

const DRIVETRAINS: DrivetrainKind[] = ["FF", "FR", "MR", "RR", "4WD"];

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{
  page?: string;
  category?: string;
  drivetrain?: string;
  max_pp?: string;
}>;

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
  const category =
    sp.category && CATEGORIES.includes(sp.category as CarCategory)
      ? (sp.category as CarCategory)
      : null;
  const drivetrain =
    sp.drivetrain && DRIVETRAINS.includes(sp.drivetrain as DrivetrainKind)
      ? (sp.drivetrain as DrivetrainKind)
      : null;
  const maxPp = sp.max_pp && /^\d+$/.test(sp.max_pp) ? Number(sp.max_pp) : null;

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

  const result = await fetchTunes({
    trackId: id,
    category,
    drivetrain,
    maxPp,
    page,
  });

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (drivetrain) params.set("drivetrain", drivetrain);
    if (maxPp) params.set("max_pp", String(maxPp));
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/tracks/${id}?${qs}` : `/tracks/${id}`;
  };

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
            {result.status === "ok" ? result.total : 0} matching tune
            {result.status === "ok" && result.total === 1 ? "" : "s"}
          </p>
        </section>

        <FilterForm
          trackId={id}
          defaults={{ category, drivetrain, max_pp: maxPp }}
        />

        <section className="mt-2">
          <TuneList
            result={result}
            buildHref={buildHref}
            emptyTitle="No tunes match these filters"
            emptyMessage={
              <>
                Clear filters or{" "}
                <Link href="/tunes/new" className="text-apex-300 hover:text-apex-200">
                  publish one
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

function FilterForm({
  trackId,
  defaults,
}: {
  trackId: string;
  defaults: {
    category: CarCategory | null;
    drivetrain: DrivetrainKind | null;
    max_pp: number | null;
  };
}) {
  return (
    <form
      method="get"
      action={`/tracks/${trackId}`}
      className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-carbon-800 bg-carbon-900/40 p-4"
    >
      <FilterField label="Category">
        <select
          name="category"
          defaultValue={defaults.category ?? ""}
          className={inputCls}
        >
          <option value="">Any</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FilterField>
      <FilterField label="Drivetrain">
        <select
          name="drivetrain"
          defaultValue={defaults.drivetrain ?? ""}
          className={inputCls}
        >
          <option value="">Any</option>
          {DRIVETRAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </FilterField>
      <FilterField label="Max PP">
        <input
          type="number"
          name="max_pp"
          min={1}
          step={1}
          defaultValue={defaults.max_pp ?? ""}
          placeholder="e.g. 500"
          className={inputCls}
        />
      </FilterField>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-full bg-apex-500 px-5 text-sm font-semibold text-carbon-950 shadow-apex transition hover:bg-apex-400"
        >
          Apply
        </button>
        <Link
          href={`/tracks/${trackId}`}
          className="text-xs uppercase tracking-[0.2em] text-carbon-400 hover:text-apex-300"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-[140px] flex-1 flex-col">
      <span className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-carbon-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-carbon-800 bg-carbon-950/80 px-3 py-2 text-sm text-carbon-100 placeholder:text-carbon-500 focus:border-apex-500/60 focus:outline-none focus:ring-1 focus:ring-apex-500/40";

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
