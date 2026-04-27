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

function parsePositiveInt(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

type TuneFields = {
  car_id: string;
  track_id: string | null;
  title: string;
  description: string | null;
  setup: Record<string, unknown>;
  lap_time_ms: number | null;
  power_hp: number | null;
  weight_kg: number | null;
  pp_total: number | null;
  is_public: boolean;
};

function extractFields(formData: FormData):
  | { ok: true; fields: TuneFields }
  | { ok: false; error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const carId = String(formData.get("car_id") ?? "").trim();
  const trackIdRaw = String(formData.get("track_id") ?? "").trim();
  const lapTimeRaw = String(formData.get("lap_time") ?? "").trim();
  const setupRaw = String(formData.get("setup") ?? "").trim();

  if (title.length < 3 || title.length > 120) {
    return { ok: false, error: "Title must be between 3 and 120 characters." };
  }
  if (!carId) {
    return { ok: false, error: "Pick a car for this tune." };
  }

  const lap_time_ms = parseLapTime(lapTimeRaw);
  if (lapTimeRaw && lap_time_ms === null) {
    return {
      ok: false,
      error: "Lap time must be in mm:ss.sss format (e.g. 1:58.421).",
    };
  }

  const setupResult = parseSetup(setupRaw);
  if (!setupResult.ok) {
    return { ok: false, error: setupResult.error };
  }

  return {
    ok: true,
    fields: {
      car_id: carId,
      track_id: trackIdRaw || null,
      title,
      description: description || null,
      setup: setupResult.value,
      lap_time_ms,
      power_hp: parsePositiveInt(formData.get("power_hp")),
      weight_kg: parsePositiveInt(formData.get("weight_kg")),
      pp_total: parsePositiveInt(formData.get("pp_total")),
      is_public: formData.get("is_public") !== null,
    },
  };
}

export async function createTune(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/tunes/new");
  }

  const parsed = extractFields(formData);
  if (!parsed.ok) {
    redirect(`/tunes/new?error=${encodeURIComponent(parsed.error)}`);
  }

  const { data, error } = await supabase
    .from("tunes")
    .insert({ author_id: user.id, ...parsed.fields })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/tunes/new?error=${encodeURIComponent(error?.message ?? "Could not save tune.")}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/tunes");
  redirect(`/tunes/${data.id}`);
}

export async function updateTune(formData: FormData): Promise<void> {
  const tuneId = String(formData.get("tune_id") ?? "").trim();
  if (!tuneId) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/tunes/${tuneId}/edit`);
  }

  const { data: existing, error: lookupError } = await supabase
    .from("tunes")
    .select("id, author_id")
    .eq("id", tuneId)
    .maybeSingle();

  if (lookupError || !existing) {
    redirect(`/tunes/${tuneId}/edit?error=Tune+not+found.`);
  }

  if (existing.author_id !== user.id) {
    redirect(`/tunes/${tuneId}?error=Not+your+tune.`);
  }

  const parsed = extractFields(formData);
  if (!parsed.ok) {
    redirect(
      `/tunes/${tuneId}/edit?error=${encodeURIComponent(parsed.error)}`,
    );
  }

  const { error } = await supabase
    .from("tunes")
    .update(parsed.fields)
    .eq("id", tuneId);

  if (error) {
    redirect(
      `/tunes/${tuneId}/edit?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/tunes");
  revalidatePath(`/tunes/${tuneId}`);
  redirect(`/tunes/${tuneId}`);
}

export async function forkTune(formData: FormData): Promise<void> {
  const tuneId = String(formData.get("tune_id") ?? "").trim();
  if (!tuneId) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/tunes/${tuneId}`);
  }

  const { data: parent, error: lookupError } = await supabase
    .from("tunes")
    .select(
      "id, author_id, car_id, track_id, title, description, setup, pp_total, power_hp, weight_kg",
    )
    .eq("id", tuneId)
    .maybeSingle();

  if (lookupError || !parent) {
    redirect(
      `/tunes/${tuneId}?error=${encodeURIComponent(
        lookupError?.message ?? "Tune not found.",
      )}`,
    );
  }

  if (parent.author_id === user.id) {
    redirect(
      `/tunes/${tuneId}?error=${encodeURIComponent(
        "You already own this tune — edit it directly.",
      )}`,
    );
  }

  const forkTitle = parent.title.startsWith("Copy of ")
    ? parent.title
    : `Copy of ${parent.title}`;

  const { data: fork, error: insertError } = await supabase
    .from("tunes")
    .insert({
      author_id: user.id,
      forked_from_id: parent.id,
      car_id: parent.car_id,
      track_id: parent.track_id,
      title: forkTitle,
      description: parent.description,
      setup: parent.setup,
      pp_total: parent.pp_total,
      power_hp: parent.power_hp,
      weight_kg: parent.weight_kg,
      // Forks intentionally start without a lap time — that's the
      // forker's number to set after they iterate on the setup.
      lap_time_ms: null,
      // Private by default so the forker can tweak before publishing.
      is_public: false,
    })
    .select("id")
    .single();

  if (insertError || !fork) {
    redirect(
      `/tunes/${tuneId}?error=${encodeURIComponent(
        insertError?.message ?? "Could not create fork.",
      )}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/tunes");
  revalidatePath(`/tunes/${tuneId}`);
  redirect(`/tunes/${fork.id}/edit`);
}

export async function deleteTune(formData: FormData): Promise<void> {
  const tuneId = String(formData.get("tune_id") ?? "").trim();
  if (!tuneId) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/tunes/${tuneId}`);
  }

  // RLS already enforces ownership on delete; this just gives a clean redirect
  // with the username when the redirect target is the user's profile.
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("tunes")
    .delete()
    .eq("id", tuneId)
    .eq("author_id", user.id);

  if (error) {
    redirect(`/tunes/${tuneId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/tunes");
  if (profile?.username) {
    revalidatePath(`/profile/${profile.username}`);
    redirect(`/profile/${profile.username}`);
  }
  redirect("/");
}
