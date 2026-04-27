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
type SearchParams = Promise<{ page?: string }>;

type CarRow = {
  id: string;
  make: string;
  model: string;
  year: number;
  drivetrain: DrivetrainKind;
  category: CarCategory;
};

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

  if (!UUID_RE.test(id)) notFound();
  if (!isSupabaseConfigured()) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: car, error: carError } = await supabase
    .from("cars")
    .select("id, make, model, year, drivetrain, category")
    .eq("id", id)
    .maybeSingle<CarRow>();

  if (carError) {
    return (
      <ErrorView title="Couldn’t load this car" message={carError.message} />
    );
  }
  if (!car) notFound();

  const result = await fetchTunes({ carId: id, page });
  const buildHref = (p: number) => (p > 1 ? `/cars/${id}?page=${p}` : `/cars/${id}`);

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
            {result.status === "ok" ? result.total : 0} published tune
            {result.status === "ok" && result.total === 1 ? "" : "s"}
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-carbon-50">Tunes</h2>
          <TuneList
            result={result}
            buildHref={buildHref}
            emptyTitle="No published tunes for this car yet"
            emptyMessage={
              <>
                Got a setup?{" "}
                <Link href="/tunes/new" className="text-apex-300 hover:text-apex-200">
                  Publish one
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
