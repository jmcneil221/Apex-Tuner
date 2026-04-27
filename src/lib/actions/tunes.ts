"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function parseLapTime(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const colon = trimmed.match(/^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/);
  if (colon) {
    const minutes = Number(colon[1]);
    const seconds = Number(colon[2]);
    const millis = Number((colon[3] ?? "0").padEnd(3, "0"));
    if (seconds >= 60) return null;
    return minutes * 60_000 + seconds * 1000 + millis;
  }

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.round(numeric);
  }

  return null;
}

type ParsedSetup =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string };

function parseSetup(input: string): ParsedSetup {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { ok: true, value: parsed as Record<string, unknown> };
    }
    return { ok: false, error: "Setup JSON must be an object." };
  } catch (err) {
    return {
      ok: false,
      error: `Setup JSON is invalid: ${err instanceof Error ? err.message : "parse error"}`,
    };
  }
}

function failTune(message: string): never {
  redirect(`/tunes/new?error=${encodeURIComponent(message)}`);
}

function parsePositiveInt(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

export async function createTune(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/tunes/new");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const carId = String(formData.get("car_id") ?? "").trim();
  const trackIdRaw = String(formData.get("track_id") ?? "").trim();
  const lapTimeRaw = String(formData.get("lap_time") ?? "").trim();
  const setupRaw = String(formData.get("setup") ?? "").trim();
  const isPublic = formData.get("is_public") !== null;
  const power_hp = parsePositiveInt(formData.get("power_hp"));
  const weight_kg = parsePositiveInt(formData.get("weight_kg"));
  const pp_total = parsePositiveInt(formData.get("pp_total"));

  if (title.length < 3 || title.length > 120) {
    failTune("Title must be between 3 and 120 characters.");
  }
  if (!carId) {
    failTune("Pick a car for this tune.");
  }

  const lap_time_ms = parseLapTime(lapTimeRaw);
  if (lapTimeRaw && lap_time_ms === null) {
    failTune("Lap time must be in mm:ss.sss format (e.g. 1:58.421).");
  }

  const setupResult = parseSetup(setupRaw);
  if (!setupResult.ok) {
    failTune(setupResult.error);
  }

  const { data, error } = await supabase
    .from("tunes")
    .insert({
      author_id: user.id,
      car_id: carId,
      track_id: trackIdRaw || null,
      title,
      description: description || null,
      setup: setupResult.value,
      lap_time_ms,
      power_hp,
      weight_kg,
      pp_total,
      is_public: isPublic,
    })
    .select("id")
    .single();

  if (error || !data) {
    failTune(error?.message ?? "Could not save tune.");
  }

  revalidatePath("/");
  redirect("/");
}
