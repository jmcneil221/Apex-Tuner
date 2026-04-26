import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { createTune } from "@/lib/actions/tunes";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CarCategory, DrivetrainKind } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type CarOption = {
  id: string;
  make: string;
  model: string;
  year: number;
  drivetrain: DrivetrainKind;
  category: CarCategory;
};

type TrackOption = {
  id: string;
  name: string;
  layout: string;
};

async function fetchCars(): Promise<CarOption[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("cars")
      .select("id, make, model, year, drivetrain, category")
      .order("make", { ascending: true })
      .order("year", { ascending: false });
    if (error) return [];
    return (data ?? []) as CarOption[];
  } catch {
    return [];
  }
}

async function fetchTracks(): Promise<TrackOption[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tracks")
      .select("id, name, layout")
      .order("name", { ascending: true });
    if (error) return [];
    return (data ?? []) as TrackOption[];
  } catch {
    return [];
  }
}

const SETUP_PLACEHOLDER = `{
  "tires": { "front": "Racing Hard", "rear": "Racing Hard" },
  "downforce": { "front": 350, "rear": 600 },
  "suspension": {
    "ride_height_mm": { "front": 75, "rear": 80 },
    "spring_rate": { "front": 11.5, "rear": 13.2 }
  },
  "transmission": { "final_drive": 3.42 },
  "brake_balance": -2,
  "ballast_kg": 0
}`;

type SearchParams = Promise<{ error?: string }>;

export default async function NewTunePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/tunes/new");
  }

  const [cars, tracks] = await Promise.all([fetchCars(), fetchTracks()]);

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-apex-400">
              Publish
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-carbon-50">
              Share a tune
            </h1>
            <p className="mt-2 max-w-xl text-sm text-carbon-400">
              Pick the car and (optionally) the track, drop in your setup sheet
              as JSON, and log your best lap. You can edit it later.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.3em] text-carbon-400 hover:text-apex-300"
          >
            Cancel
          </Link>
        </div>

        {error ? (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-rev-500/40 bg-rev-500/10 px-4 py-3 text-sm text-rev-200"
          >
            {decodeURIComponent(error)}
          </div>
        ) : null}

        {cars.length === 0 ? (
          <div className="mb-6 rounded-lg border border-carbon-800 bg-carbon-900/50 px-4 py-3 text-sm text-carbon-300">
            No cars in the catalog yet. Apply{" "}
            <code className="font-mono text-apex-300">supabase/seed.sql</code>{" "}
            (or run <code className="font-mono text-apex-300">supabase db reset</code>) to
            populate reference data.
          </div>
        ) : null}

        <form action={createTune} className="space-y-6">
          <Field label="Title" hint="3–120 characters">
            <input
              type="text"
              name="title"
              required
              minLength={3}
              maxLength={120}
              placeholder="e.g. Suzuka N400 — corner exit special"
              className={inputCls}
            />
          </Field>

          <Field label="Car" hint="Required">
            <select
              name="car_id"
              required
              defaultValue=""
              className={inputCls}
              disabled={cars.length === 0}
            >
              <option value="" disabled>
                {cars.length === 0 ? "No cars available" : "Select a car…"}
              </option>
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.year} {car.make} {car.model} — {car.category} (
                  {car.drivetrain})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Track" hint="Optional — leave blank for any track">
            <select name="track_id" defaultValue="" className={inputCls}>
              <option value="">Any track</option>
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name} — {track.layout}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Best lap" hint="Format: m:ss.sss (e.g. 1:58.421)">
            <input
              type="text"
              name="lap_time"
              inputMode="numeric"
              pattern="^\d+:\d{1,2}(\.\d{1,3})?$"
              placeholder="1:58.421"
              className={inputCls}
            />
          </Field>

          <Field label="Description" hint="Optional notes">
            <textarea
              name="description"
              rows={3}
              maxLength={2000}
              placeholder="What kind of conditions does this tune favor?"
              className={`${inputCls} resize-y`}
            />
          </Field>

          <Field label="Setup sheet" hint="JSON object">
            <textarea
              name="setup"
              rows={12}
              defaultValue=""
              placeholder={SETUP_PLACEHOLDER}
              className={`${inputCls} font-mono text-xs leading-relaxed resize-y`}
              spellCheck={false}
            />
          </Field>

          <label className="flex items-center gap-3 text-sm text-carbon-300">
            <input
              type="checkbox"
              name="is_public"
              defaultChecked
              className="h-4 w-4 rounded border-carbon-700 bg-carbon-900 text-apex-500 focus:ring-apex-500"
            />
            Publish publicly to the leaderboard
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/"
              className="rounded-full border border-carbon-700 bg-carbon-900/60 px-5 py-2 text-sm text-carbon-200 hover:border-apex-500/40 hover:text-apex-200"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-apex-500 px-6 py-2 text-sm font-semibold text-carbon-950 shadow-apex transition hover:bg-apex-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={cars.length === 0}
            >
              Publish tune
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-carbon-800 bg-carbon-950/80 px-3 py-2 text-sm text-carbon-100 placeholder:text-carbon-500 focus:border-apex-500/60 focus:outline-none focus:ring-1 focus:ring-apex-500/40";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-carbon-300">
          {label}
        </span>
        {hint ? <span className="text-[11px] text-carbon-500">{hint}</span> : null}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
