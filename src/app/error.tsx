'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only safe correlator between what the shopper saw and
    // the server log; never render the message itself.
    console.error('Unhandled application error', error.digest);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="label-caps">Something went wrong</p>
      <h1 className="mt-4 text-4xl">We hit a snag</h1>
      <p className="mt-4 text-muted-foreground">
        This one is on us. Try again — if it keeps happening, our team can help.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-subtle-foreground">
          Reference: {error.digest}
        </p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </main>
  );
}
