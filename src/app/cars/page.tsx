import Link from "next/link";
import { Header } from "@/components/Header";
import { isSupabaseConfigured } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CarCategory, DrivetrainKind } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Car = {
  id: string;
  make: string;
  model: string;
  year: number;
  drivetrain: DrivetrainKind;
  category: CarCategory;
};

async function loadCars(): Promise<{
  configured: boolean;
  error: string | null;
  cars: Car[];
  countsByCarId: Map<string, number>;
}> {
  if (!isSupabaseConfigured()) {
    return { configured: false, error: null, cars: [], countsByCarId: new Map() };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const [carsResp, countsResp] = await Promise.all([
      supabase
        .from("cars")
        .select("id, make, model, year, drivetrain, category")
        .order("make")
        .order("year", { ascending: false }),
      // Single grouped fetch — fine at our scale (~thousands of rows).
      // Long-term, prefer a Postgres view or RPC that returns
      // (car_id, count) directly.
      supabase.from("tunes").select("car_id").eq("is_public", true),
    ]);

    if (carsResp.error) {
      return {
        configured: true,
        error: carsResp.error.message,
        cars: [],
        countsByCarId: new Map(),
      };
    }

    const counts = new Map<string, number>();
    for (const row of countsResp.data ?? []) {
      const id = (row as { car_id: string }).car_id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    return {
      configured: true,
      error: null,
      cars: (carsResp.data ?? []) as Car[],
      countsByCarId: counts,
    };
  } catch (err) {
    return {
      configured: true,
      error: err instanceof Error ? err.message : "unknown error",
      cars: [],
      countsByCarId: new Map(),
    };
  }
}

export default async function CarsPage() {
  const { configured, error, cars, countsByCarId } = await loadCars();

  const grouped = new Map<string, Car[]>();
  for (const car of cars) {
    const list = grouped.get(car.make);
    if (list) list.push(car);
    else grouped.set(car.make, [car]);
  }
  const makes = [...grouped.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="mb-8">
          <span className="text-xs uppercase tracking-[0.3em] text-apex-400">
            Garage
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-carbon-50">
            Cars
          </h1>
          <p className="mt-2 max-w-xl text-sm text-carbon-400">
            Every car in the ApexTuner catalog. Click into any to see its
            published tunes.
          </p>
        </div>

        {!configured ? (
          <Notice tone="info" title="Supabase not configured">
            Set the env vars in <code className="font-mono">.env.local</code>.
          </Notice>
        ) : error ? (
          <Notice tone="error" title="Couldn’t load cars">
            <span className="font-mono">{error}</span>
          </Notice>
        ) : cars.length === 0 ? (
          <Notice tone="info" title="No cars in the catalog yet">
            Apply <code className="font-mono">supabase/seed.sql</code> to populate.
          </Notice>
        ) : (
          <div className="space-y-10">
            {makes.map((make) => (
              <section key={make}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-apex-300">
                  {make}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped.get(make)!.map((car) => (
                    <CarCardLink
                      key={car.id}
                      car={car}
                      tuneCount={countsByCarId.get(car.id) ?? 0}
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

function CarCardLink({ car, tuneCount }: { car: Car; tuneCount: number }) {
  return (
    <Link
      href={`/cars/${car.id}`}
      className="group block rounded-xl border border-carbon-800 bg-carbon-900/50 p-4 transition hover:border-apex-500/40 hover:bg-carbon-900/80"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-carbon-50 group-hover:text-apex-200">
            {car.year} {car.model}
          </h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-apex-500/30 bg-apex-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-apex-200">
              {car.category}
            </span>
            <span className="rounded-full border border-carbon-700 bg-carbon-950 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-carbon-300">
              {car.drivetrain}
            </span>
          </div>
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
