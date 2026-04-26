import Link from "next/link";
import { redirect } from "next/navigation";
import { signInWithGithub } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string; next?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, next } = await searchParams;
  const user = await getCurrentUser();
  if (user) {
    redirect(next && next.startsWith("/") ? next : "/");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-carbon-800 bg-carbon-900/60 p-8 shadow-apex backdrop-blur">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-carbon-400 hover:text-apex-300"
        >
          ← Back
        </Link>

        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.3em] text-apex-400">
            ApexTuner
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-carbon-50">
            Sign in to publish a tune
          </h1>
          <p className="text-sm text-carbon-400">
            ApexTuner uses GitHub for authentication. We only ask for your
            public profile.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-rev-500/40 bg-rev-500/10 px-4 py-3 text-sm text-rev-200"
          >
            {decodeURIComponent(error)}
          </div>
        ) : null}

        <form action={signInWithGithub} className="mt-8">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <button
            type="submit"
            className="group inline-flex h-11 w-full items-center justify-center gap-3 rounded-full bg-apex-500 px-5 text-sm font-semibold text-carbon-950 shadow-apex transition hover:bg-apex-400"
          >
            <GithubMark />
            Continue with GitHub
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-carbon-500">
          By signing in you agree to play fair on track.
        </p>
      </div>
    </div>
  );
}

function GithubMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      aria-hidden="true"
      className="fill-current"
    >
      <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.69.08-.69 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.3-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.3-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18a10.94 10.94 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.74.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.07.78 2.16v3.2c0 .31.21.67.79.55 4.57-1.53 7.85-5.84 7.85-10.93C23.5 5.66 18.34.5 12 .5z" />
    </svg>
  );
}
