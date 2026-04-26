import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export async function Header() {
  const user = await getCurrentUser();
  const username =
    (user?.user_metadata?.user_name as string | undefined) ??
    (user?.user_metadata?.preferred_username as string | undefined) ??
    user?.email?.split("@")[0];
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <header className="border-b border-carbon-800/80 bg-carbon-950/60 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-md bg-carbon-900 ring-1 ring-apex-500/40">
            <span className="absolute inset-0 rounded-md bg-apex-500/10 blur-md" />
            <span className="relative font-mono text-sm font-bold text-apex-300">
              AT
            </span>
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-[0.2em] text-carbon-200">
              APEXTUNER
            </span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-apex-400/80">
              GT7 Telemetry · Tuning
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-carbon-300 sm:flex">
          <Link className="hover:text-apex-300" href="/tunes">
            Tunes
          </Link>
          <Link className="hover:text-apex-300" href="/cars">
            Cars
          </Link>
          <Link className="hover:text-apex-300" href="/tracks">
            Tracks
          </Link>

          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-carbon-800">
              <Link
                href="/tunes/new"
                className="rounded-full bg-apex-500/90 px-3 py-1.5 text-xs font-semibold text-carbon-950 transition hover:bg-apex-400"
              >
                New tune
              </Link>
              <div className="flex items-center gap-2">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-7 w-7 rounded-full ring-1 ring-carbon-700"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-carbon-800 text-[11px] font-mono text-carbon-200">
                    {(username ?? "?").slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="text-xs text-carbon-300">{username}</span>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-xs uppercase tracking-wider text-carbon-500 hover:text-rev-400"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-apex-500/40 bg-apex-500/10 px-4 py-1.5 text-apex-200 transition hover:bg-apex-500/20"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
