import Link from "next/link";
import { formatLapTime, type TuneWithRelations } from "@/lib/supabase/types";

export function TuneCard({ tune }: { tune: TuneWithRelations }) {
  const car = tune.cars
    ? `${tune.cars.year} ${tune.cars.make} ${tune.cars.model}`
    : "Unknown car";
  const track = tune.tracks
    ? `${tune.tracks.name} — ${tune.tracks.layout}`
    : null;
  const author =
    tune.profiles?.display_name ?? tune.profiles?.username ?? "anonymous";
  const category = tune.cars?.category;
  const drivetrain = tune.cars?.drivetrain;

  return (
    <Link
      href={`/tunes/${tune.id}`}
      className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-500/60"
    >
    <article className="flex flex-col rounded-xl border border-carbon-800 bg-carbon-900/50 p-5 transition group-hover:border-apex-500/40 group-hover:bg-carbon-900/80">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-carbon-50 group-hover:text-apex-200">
            {tune.title}
          </h3>
          <p className="mt-0.5 truncate text-xs uppercase tracking-wider text-carbon-400">
            {car}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-carbon-700 bg-carbon-950 px-2.5 py-1 text-xs font-medium text-apex-300">
          <span className="text-apex-400">▲</span>
          {tune.upvote_count}
        </div>
      </header>

      {category || drivetrain ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {category ? (
            <span className="rounded-full border border-apex-500/30 bg-apex-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-apex-200">
              {category}
            </span>
          ) : null}
          {drivetrain ? (
            <span className="rounded-full border border-carbon-700 bg-carbon-950 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-carbon-300">
              {drivetrain}
            </span>
          ) : null}
        </div>
      ) : null}

      {tune.description ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-carbon-300">
          {tune.description}
        </p>
      ) : null}

      <footer className="mt-4 flex items-center justify-between gap-3 border-t border-carbon-800 pt-3 text-xs text-carbon-400">
        <span className="truncate" title={track ?? "Any track"}>
          {track ?? "Any track"}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-rev-400">
            {formatLapTime(tune.lap_time_ms)}
          </span>
          <span className="text-carbon-500">@{author}</span>
        </span>
      </footer>
    </article>
    </Link>
  );
}
