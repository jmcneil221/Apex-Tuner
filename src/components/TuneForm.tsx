import Link from "next/link";
import {
  formatLapTime,
  type CarCategory,
  type DrivetrainKind,
  type Tune,
} from "@/lib/supabase/types";

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

const SETUP_PLACEHOLDER = `{
  "tires": { "front": "Racing Hard", "rear": "Racing Hard" },
  "downforce": { "front": 350, "rear": 600 },
  "ride_height_mm": { "front": 75, "rear": 80 },
  "spring_rate_kgf_mm": { "front": 11.5, "rear": 13.2 },
  "transmission": { "final_drive": 3.42 },
  "brake_balance": -2,
  "ballast_kg": 0
}`;

type Props = {
  cars: CarOption[];
  tracks: TrackOption[];
  action: (formData: FormData) => Promise<void>;
  tune?: Tune | null;
  tuneId?: string;
  error?: string | null;
  submitLabel: string;
  cancelHref: string;
};

export function TuneForm({
  cars,
  tracks,
  action,
  tune,
  tuneId,
  error,
  submitLabel,
  cancelHref,
}: Props) {
  const lapTimeDefault =
    tune?.lap_time_ms != null && tune.lap_time_ms > 0
      ? formatLapTime(tune.lap_time_ms)
      : "";
  const setupDefault = tune
    ? JSON.stringify(tune.setup ?? {}, null, 2)
    : "";

  return (
    <>
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-rev-500/40 bg-rev-500/10 px-4 py-3 text-sm text-rev-200"
        >
          {error}
        </div>
      ) : null}

      {cars.length === 0 ? (
        <div className="mb-6 rounded-lg border border-carbon-800 bg-carbon-900/50 px-4 py-3 text-sm text-carbon-300">
          No cars in the catalog yet. Apply{" "}
          <code className="font-mono text-apex-300">supabase/seed.sql</code> to populate
          reference data.
        </div>
      ) : null}

      <form action={action} className="space-y-6">
        {tuneId ? <input type="hidden" name="tune_id" value={tuneId} /> : null}
        <Field label="Title" hint="3–120 characters">
          <input
            type="text"
            name="title"
            required
            minLength={3}
            maxLength={120}
            defaultValue={tune?.title ?? ""}
            placeholder="e.g. Suzuka N400 — corner exit special"
            className={inputCls}
          />
        </Field>

        <Field label="Car" hint="Required">
          <select
            name="car_id"
            required
            defaultValue={tune?.car_id ?? ""}
            className={inputCls}
            disabled={cars.length === 0}
          >
            <option value="" disabled>
              {cars.length === 0 ? "No cars available" : "Select a car…"}
            </option>
            {cars.map((car) => (
              <option key={car.id} value={car.id}>
                {car.year} {car.make} {car.model} — {car.category} ({car.drivetrain})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Track" hint="Optional — leave blank for any track">
          <select
            name="track_id"
            defaultValue={tune?.track_id ?? ""}
            className={inputCls}
          >
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
            defaultValue={lapTimeDefault}
            placeholder="1:58.421"
            className={inputCls}
          />
        </Field>

        <fieldset>
          <legend className="text-xs font-medium uppercase tracking-[0.18em] text-carbon-300">
            Balance of performance
          </legend>
          <p className="mt-1 text-[11px] text-carbon-500">
            Optional. Post-tune values reported by GT7.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SubField label="PP" hint="e.g. 498">
              <input
                type="number"
                name="pp_total"
                min={1}
                step={1}
                inputMode="numeric"
                defaultValue={tune?.pp_total ?? ""}
                placeholder="498"
                className={inputCls}
              />
            </SubField>
            <SubField label="Power (hp)" hint="e.g. 478">
              <input
                type="number"
                name="power_hp"
                min={1}
                step={1}
                inputMode="numeric"
                defaultValue={tune?.power_hp ?? ""}
                placeholder="478"
                className={inputCls}
              />
            </SubField>
            <SubField label="Weight (kg)" hint="e.g. 1560">
              <input
                type="number"
                name="weight_kg"
                min={1}
                step={1}
                inputMode="numeric"
                defaultValue={tune?.weight_kg ?? ""}
                placeholder="1560"
                className={inputCls}
              />
            </SubField>
          </div>
        </fieldset>

        <Field label="Description" hint="Optional notes">
          <textarea
            name="description"
            rows={3}
            maxLength={2000}
            defaultValue={tune?.description ?? ""}
            placeholder="What kind of conditions does this tune favor?"
            className={`${inputCls} resize-y`}
          />
        </Field>

        <Field label="Setup sheet" hint="JSON object">
          <textarea
            name="setup"
            rows={12}
            defaultValue={setupDefault}
            placeholder={SETUP_PLACEHOLDER}
            className={`${inputCls} font-mono text-xs leading-relaxed resize-y`}
            spellCheck={false}
          />
        </Field>

        <label className="flex items-center gap-3 text-sm text-carbon-300">
          <input
            type="checkbox"
            name="is_public"
            defaultChecked={tune?.is_public ?? true}
            className="h-4 w-4 rounded border-carbon-700 bg-carbon-900 text-apex-500 focus:ring-apex-500"
          />
          Publish publicly to the leaderboard
        </label>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={cancelHref}
            className="rounded-full border border-carbon-700 bg-carbon-900/60 px-5 py-2 text-sm text-carbon-200 hover:border-apex-500/40 hover:text-apex-200"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-apex-500 px-6 py-2 text-sm font-semibold text-carbon-950 shadow-apex transition hover:bg-apex-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={cars.length === 0}
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </>
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

function SubField({
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
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-carbon-400">
          {label}
        </span>
        {hint ? <span className="text-[10px] text-carbon-500">{hint}</span> : null}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

type CarOptionExport = CarOption;
type TrackOptionExport = TrackOption;
export type { CarOptionExport as CarOption, TrackOptionExport as TrackOption };
