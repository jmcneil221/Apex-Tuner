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

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{
  page?: string;
  track?: string;
  max_pp?: string;
}>;

type CarRow = {
  id: string;
  make: string;
  model: string;
  year: number;
  drivetrain: DrivetrainKind;
  category: CarCategory;
};

type TrackOption = { id: string; name: string; layout: string };

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  if (!UUID_RE.test(id) || !isSupabaseConfigured()) {
    return { title: "Car — ApexTuner" };
  }
  const supabase = await createSupabaseServerClient();
  const { data: car } = await supabase
    .from("cars")
    .select("make, model, year")
    .eq("id", id)
    .maybeSingle<{ make: string; model: string; year: number }>();
  if (!car) return { title: "Car — ApexTuner" };
  return {
    title: `${car.year} ${car.make} ${car.model} — ApexTuner`,
    description: `Published tunes for the ${car.year} ${car.make} ${car.model} on ApexTuner.`,
  };
}

export default async function CarDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = sp.page && /^\d+$/.test(sp.page) ? Math.max(1, Number(sp.page)) : 1;
  const trackId = sp.track?.trim() || null;
  const maxPp = sp.max_pp && /^\d+$/.test(sp.max_pp) ? Number(sp.max_pp) : null;

  if (!UUID_RE.test(id)) notFound();
  if (!isSupabaseConfigured()) notFound();

  const supabase = await createSupabaseServerClient();
  const [{ data: car, error: carError }, { data: tracksData }] = await Promise.all([
    supabase
      .from("cars")
      .select("id, make, model, year, drivetrain, category")
      .eq("id", id)
      .maybeSingle<CarRow>(),
    supabase.from("tracks").select("id, name, layout").order("name"),
  ]);

  if (carError) {
    return <ErrorView title="Couldn’t load this car" message={carError.message} />;
  }
  if (!car) notFound();

  const tracks = (tracksData ?? []) as TrackOption[];

  const result = await fetchTunes({
    carId: id,
    trackId,
    maxPp,
    page,
  });

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (trackId) params.set("track", trackId);
    if (maxPp) params.set("max_pp", String(maxPp));
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/cars/${id}?${qs}` : `/cars/${id}`;
  };

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <Link
          href="/cars"
          className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-carbon-400 hover:text-apex-300"
        >
          ← All cars
        </Link>

        <section className="rounded-2xl border border-carbon-800 bg-carbon-900/40 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-apex-500/30 bg-apex-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-apex-200">
              {car.category}
            </span>
            <span className="rounded-full border border-carbon-700 bg-carbon-950 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-carbon-300">
              {car.drivetrain}
            </span>
          </div>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-carbon-50 md:text-4xl">
            {car.year} {car.make} {car.model}
          </h1>
          <p className="mt-2 text-sm text-carbon-400">
            {result.status === "ok" ? result.total : 0} matching tune
            {result.status === "ok" && result.total === 1 ? "" : "s"}
          </p>
        </section>

        <FilterForm
          carId={id}
          tracks={tracks}
          defaults={{ track: trackId, max_pp: maxPp }}
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
  carId,
  tracks,
  defaults,
}: {
  carId: string;
  tracks: TrackOption[];
  defaults: { track: string | null; max_pp: number | null };
}) {
  return (
    <form
      method="get"
      action={`/cars/${carId}`}
      className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-carbon-800 bg-carbon-900/40 p-4"
    >
      <FilterField label="Track">
        <select name="track" defaultValue={defaults.track ?? ""} className={inputCls}>
          <option value="">Any track</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.layout}
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
          href={`/cars/${carId}`}
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
    <label className="flex min-w-[180px] flex-1 flex-col">
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
