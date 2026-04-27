"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ToggleUpvoteResult = {
  voted: boolean;
};

export async function toggleUpvote(formData: FormData): Promise<void> {
  const tuneId = String(formData.get("tune_id") ?? "").trim();
  if (!tuneId) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/tunes/${encodeURIComponent(tuneId)}`);
  }

  const { data: existing, error: selectError } = await supabase
    .from("tune_votes")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("tune_id", tuneId)
    .maybeSingle();

  if (selectError) {
    console.warn("[apextuner] vote lookup failed:", selectError.message);
    return;
  }

  if (existing) {
    const { error } = await supabase
      .from("tune_votes")
      .delete()
      .eq("user_id", user.id)
      .eq("tune_id", tuneId);
    if (error) {
      console.warn("[apextuner] unvote failed:", error.message);
      return;
    }
  } else {
    const { error } = await supabase
      .from("tune_votes")
      .insert({ user_id: user.id, tune_id: tuneId });
    if (error) {
      console.warn("[apextuner] vote failed:", error.message);
      return;
    }
  }

  revalidatePath(`/tunes/${tuneId}`);
  revalidatePath("/");
}
