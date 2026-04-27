export type DrivetrainKind = "FF" | "FR" | "MR" | "RR" | "4WD";

export type CarCategory =
  | "N100" | "N200" | "N300" | "N400" | "N500"
  | "N600" | "N700" | "N800" | "N900" | "N1000"
  | "Gr.4" | "Gr.3" | "Gr.2" | "Gr.1" | "Gr.B" | "Gr.X";

export type Tune = {
  id: string;
  author_id: string;
  car_id: string;
  track_id: string | null;
  title: string;
  description: string | null;
  setup: Record<string, unknown>;
  lap_time_ms: number | null;
  upvote_count: number;
  is_public: boolean;
  power_hp: number | null;
  weight_kg: number | null;
  pp_total: number | null;
  is_validated: boolean;
  forked_from_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ForkedFromRelation = {
  id: string;
  title: string;
  profiles: {
    username: string;
    display_name: string | null;
  } | null;
} | null;

export function formatBoP(
  pp: number | null,
  hp: number | null,
  kg: number | null,
): string | null {
  const parts: string[] = [];
  if (typeof pp === "number") parts.push(`PP ${pp}`);
  if (typeof hp === "number") parts.push(`${hp} hp`);
  if (typeof kg === "number") parts.push(`${kg.toLocaleString()} kg`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export type TuneWithRelations = Tune & {
  cars: {
    make: string;
    model: string;
    year: number;
    drivetrain: DrivetrainKind;
    category: CarCategory;
  } | null;
  tracks: {
    name: string;
    layout: string;
    country?: string | null;
  } | null;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url?: string | null;
  } | null;
  forked_from?: ForkedFromRelation;
};

export function formatLapTime(ms: number | null): string {
  if (ms === null || ms <= 0) return "—";
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis
    .toString()
    .padStart(3, "0")}`;
}
