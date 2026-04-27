import { isSupabaseConfigured } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CarCategory,
  DrivetrainKind,
  TuneWithRelations,
} from "@/lib/supabase/types";

export const DEFAULT_PAGE_SIZE = 12;

export type TunesFilters = {
  category?: CarCategory | null;
  drivetrain?: DrivetrainKind | null;
  trackId?: string | null;
  carId?: string | null;
  authorId?: string | null;
  maxPp?: number | null;
  q?: string | null;
  page?: number;
  pageSize?: number;
  publicOnly?: boolean;
};

export type FetchTunesResult =
  | { status: "not-configured" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      tunes: TuneWithRelations[];
      total: number;
      page: number;
      pageSize: number;
    };

export async function fetchTunes(
  filters: TunesFilters = {},
): Promise<FetchTunesResult> {
  if (!isSupabaseConfigured()) return { status: "not-configured" };

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, Math.min(48, filters.pageSize ?? DEFAULT_PAGE_SIZE));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const publicOnly = filters.publicOnly ?? true;

  try {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("tunes")
      .select(
        `
          id, author_id, car_id, track_id,
          title, description, setup,
          lap_time_ms, upvote_count, is_public,
          power_hp, weight_kg, pp_total, is_validated,
          forked_from_id, created_at, updated_at,
          cars!inner ( make, model, year, drivetrain, category ),
          tracks ( name, layout ),
          profiles!tunes_author_id_fkey ( username, display_name ),
          forked_from:tunes!forked_from_id (
            id,
            title,
            profiles!tunes_author_id_fkey ( username, display_name )
          )
        `,
        { count: "exact" },
      );

    if (publicOnly) query = query.eq("is_public", true);
    if (filters.category) query = query.eq("cars.category", filters.category);
    if (filters.drivetrain) query = query.eq("cars.drivetrain", filters.drivetrain);
    if (filters.trackId) query = query.eq("track_id", filters.trackId);
    if (filters.carId) query = query.eq("car_id", filters.carId);
    if (filters.authorId) query = query.eq("author_id", filters.authorId);
    if (typeof filters.maxPp === "number") query = query.lte("pp_total", filters.maxPp);
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
      page,
      pageSize,
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "unknown error",
    };
  }
}
