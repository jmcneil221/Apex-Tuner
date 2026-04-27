import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import {
  TuneForm,
  type CarOption,
  type TrackOption,
} from "@/components/TuneForm";
import { updateTune } from "@/lib/actions/tunes";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tune } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchCars(): Promise<CarOption[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("cars")
      .select("id, make, model, year, drivetrain, category")
      .order("make")
      .order("year", { ascending: false });
    return (data ?? []) as CarOption[];
  } catch {
    return [];
  }
}

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

export default async function EditTunePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  if (!UUID_RE.test(id)) notFound();

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/tunes/${id}/edit`);
  }

  if (!isSupabaseConfigured()) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { data: tune } = await supabase
    .from("tunes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!tune) notFound();
  if (tune.author_id !== user.id) {
    redirect(`/tunes/${id}?error=Not+your+tune.`);
  }

  const [cars, tracks] = await Promise.all([fetchCars(), fetchTracks()]);

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-apex-400">
              Edit
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-carbon-50">
              {tune.title}
            </h1>
          </div>
          <Link
            href={`/tunes/${id}`}
            className="text-xs uppercase tracking-[0.3em] text-carbon-400 hover:text-apex-300"
          >
            Cancel
          </Link>
        </div>

        <TuneForm
          cars={cars}
          tracks={tracks}
          action={updateTune}
          tune={tune as Tune}
          tuneId={id}
          error={error ? decodeURIComponent(error) : null}
          submitLabel="Save changes"
          cancelHref={`/tunes/${id}`}
        />
      </main>
    </div>
  );
}
