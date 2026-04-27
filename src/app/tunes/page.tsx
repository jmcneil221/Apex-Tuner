import Link from "next/link";
import { Header } from "@/components/Header";
import { TuneCard } from "@/components/TuneCard";
import { isSupabaseConfigured } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CarCategory,
  DrivetrainKind,
  TuneWithRelations,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

const CATEGORIES: CarCategory[] = [
  "N100", "N200", "N300", "N400", "N500",
  "N600", "N700", "N800", "N900", "N1000",
  "Gr.4", "Gr.3", "Gr.2", "Gr.1", "Gr.B", "Gr.X",
];

const DRIVETRAINS: DrivetrainKind[] = ["FF", "FR", "MR", "RR", "4WD"];

type SearchParams = Promise<{
  category?: string;
  drivetrain?: string;
  track?: string;
  max_pp?: string;
  q?: string;
  page?: string;
}>;

type Filters = {
  category: CarCategory | null;
  drivetrain: DrivetrainKind | null;
  track: string | null;
  max_pp: number | null;
  q: string | null;
  page: number;
};

function parseFilters(raw: Awaited<SearchParams>): Filters {
  const category = raw.category && CATEGORIES.includes(raw.category as CarCategory)
    ? (raw.category as CarCategory)
    : null;
  const drivetrain = raw.drivetrain && DRIVETRAINS.includes(raw.drivetrain as DrivetrainKind)
    ? (raw.drivetrain as DrivetrainKind)
    : null;
  const track = raw.track?.trim() || null;
  const max_pp = raw.max_pp && /^\d+$/.test(raw.max_pp) ? Number(raw.max_pp) : null;
  const q = raw.q?.trim() || null;
  const page = raw.page && /^\d+$/.test(raw.page) ? Math.max(1, Number(raw.page)) : 1;
  return { category, drivetrain, track, max_pp, q, page };
}

type TrackOption = { id: string; name: string; layout: string };

async function fetchTracks(): Promise<TrackOption[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("tracks")
      .select("id, name, layout")
      .order("name");
    return (data ?? []) as TrackOption[];
  } catch {
    return [];
  }
}

type Result =
  | { status: "not-configured" }
  | { status: "error"; message: string }
  | { status: "ok"; tunes: TuneWithRelations[]; total: number };

async function fetchTunes(filters: Filters): Promise<Result> {
  if (!isSupabaseConfigured()) return { status: "not-configured" };

  try {
    const supabase = await createSupabaseServerClient();
    const from = (filters.page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("tunes")
      .select(
        `
          id, author_id, car_id, track_id,
          title, description, setup,
          lap_time_ms, upvote_count, is_public,
          power_hp, weight_kg, pp_total, is_validated,
          created_at, updated_at,
          cars!inner ( make, model, year, drivetrain, category ),
          tracks ( name, layout ),
          profiles!tunes_author_id_fkey ( username, display_name )
        `,
        { count: "exact" },
      )
      .eq("is_public", true);

    if (filters.category) query = query.eq("cars.category", filters.category);
    if (filters.drivetrain) query = query.eq("cars.drivetrain", filters.drivetrain);
    if (filters.track) query = query.eq("track_id", filters.track);
    if (filters.max_pp !== null) query = query.lte("pp_total", filters.max_pp);
    if (filters.q) query = query.ilike("title", `%${filters.q}%`);

    const { data, error, count } = await query
      .order("upvote_count", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return { status: "error", message: error.message };
    return {
      status: "ok",
      tunes: (data ?? []) as unknown as TuneWithRelations[],
      total: count ?? 0,
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "unknown error",
    };
  }
}

export default async function TunesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;
  const filters = parseFilters(raw);
  const [tracks, result] = await Promise.all([
    fetchTracks(),
    fetchTunes(filters),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-apex-400">
              Leaderboard
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-carbon-50">
              All published tunes
            </h1>
          </div>
          <Link
            href="/tunes/new"
            className="hidden h-10 items-center justify-center rounded-full bg-apex-500 px-5 text-sm font-semibold text-carbon-950 shadow-apex transition hover:bg-apex-400 sm:inline-flex"
          >
            Publish a tune
          </Link>
        </div>

        <FilterBar tracks={tracks} filters={filters} />

        {result.status === "not-configured" ? (
          <Notice tone="info" title="Supabase not configured">
            Set <code className="font-mono text-apex-300">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="font-mono text-apex-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </Notice>
        ) : result.status === "error" ? (
          <Notice tone="error" title="Couldn’t load tunes">
            <span className="font-mono">{result.message}</span>
          </Notice>
        ) : result.tunes.length === 0 ? (
          <Notice tone="info" title="No tunes match these filters">
            Try clearing one or more filters, or{" "}
            <Link href="/tunes/new" className="text-apex-300 hover:text-apex-200">
              publish the first one
            </Link>
            .
          </Notice>
        ) : (
          <>
            <div className="mt-6 text-xs text-carbon-500">
              Showing {(filters.page - 1) * PAGE_SIZE + 1}–
              {Math.min(filters.page * PAGE_SIZE, result.total)} of {result.total}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.tunes.map((tune) => (
                <TuneCard key={tune.id} tune={tune} />
              ))}
            </div>
            <Pagination
              page={filters.page}
              total={result.total}
              pageSize={PAGE_SIZE}
              filters={raw}
            />
          </>
        )}
      </main>
    </div>
  );
}

function FilterBar({
  tracks,
  filters,
}: {
  tracks: TrackOption[];
  filters: Filters;
}) {
  return (
    <form
      method="get"
      className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-carbon-800 bg-carbon-900/40 p-4"
    >
      <FilterField label="Search">
        <input
          type="text"
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Title contains…"
          className={inputCls}
        />
      </FilterField>
      <FilterField label="Category">
        <select name="category" defaultValue={filters.category ?? ""} className={inputCls}>
          <option value="">Any</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FilterField>
      <FilterField label="Drivetrain">
        <select name="drivetrain" defaultValue={filters.drivetrain ?? ""} className={inputCls}>
          <option value="">Any</option>
          {DRIVETRAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </FilterField>
      <FilterField label="Track">
        <select name="track" defaultValue={filters.track ?? ""} className={inputCls}>
          <option value="">Any</option>
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
          defaultValue={filters.max_pp ?? ""}
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
          href="/tunes"
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

function Pagination({
  page,
  total,
  pageSize,
  filters,
}: {
  page: number;
  total: number;
  pageSize: number;
  filters: Awaited<SearchParams>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.category) params.set("category", filters.category);
    if (filters.drivetrain) params.set("drivetrain", filters.drivetrain);
    if (filters.track) params.set("track", filters.track);
    if (filters.max_pp) params.set("max_pp", filters.max_pp);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/tunes?${qs}` : "/tunes";
  };

  return (
    <nav className="mt-8 flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          className="rounded-full border border-carbon-700 bg-carbon-900/60 px-4 py-2 text-carbon-200 hover:border-apex-500/40 hover:text-apex-200"
        >
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="font-mono text-xs text-carbon-500">
        Page {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          className="rounded-full border border-carbon-700 bg-carbon-900/60 px-4 py-2 text-carbon-200 hover:border-apex-500/40 hover:text-apex-200"
        >
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
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
    <div className={`mt-8 rounded-xl border p-6 ${accent}`}>
      <h2 className="text-base font-semibold text-carbon-50">{title}</h2>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-carbon-800 bg-carbon-950/80 px-3 py-2 text-sm text-carbon-100 placeholder:text-carbon-500 focus:border-apex-500/60 focus:outline-none focus:ring-1 focus:ring-apex-500/40";
