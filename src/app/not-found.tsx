import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center"
    >
      <p className="label-caps">404</p>
      <h1 className="mt-4 text-4xl">This page has moved on</h1>
      <p className="mt-4 text-muted-foreground">
        The page you were looking for is not here. It may have been renamed, or the piece
        may no longer be in the collection.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/shop"
          className="rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
        >
          Browse the shop
        </Link>
        <Link
          href="/"
          className="rounded-md border border-border-strong px-5 py-2.5 text-sm transition-colors hover:bg-surface-muted"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
