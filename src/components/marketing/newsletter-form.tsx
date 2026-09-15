'use client';

import { useState, useTransition } from 'react';
import { ArrowRight } from 'lucide-react';

import { subscribeAction } from '@/actions/newsletter';
import { cn } from '@/lib/utils';

/**
 * Email capture.
 *
 * `tone="dark"` is for the teal footer, where the light-surface input styling
 * would be invisible.
 */
export function NewsletterForm({
  source = 'footer',
  tone = 'light',
  className,
}: {
  source?: string;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dark = tone === 'dark';

  if (done) {
    return (
      <p
        role="status"
        className={cn('text-sm', dark ? 'text-primary-foreground/85' : 'text-muted-foreground', className)}
      >
        You&rsquo;re on the list — look out for first access to new arrivals.
      </p>
    );
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await subscribeAction({ email, source });
      if (result.ok) {
        setDone(true);
        setEmail('');
        return;
      }
      setError(result.error.fields?.email?.[0] ?? result.error.message);
    });
  }

  return (
    <form onSubmit={onSubmit} className={className} noValidate>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
          aria-label="Email address"
          aria-invalid={error ? true : undefined}
          placeholder="Your email address"
          autoComplete="email"
          className={cn(
            'h-11 w-full min-w-0 rounded-full border px-4 text-sm transition-colors',
            dark
              ? 'border-primary-foreground/30 bg-transparent text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:border-primary-foreground/70'
              : 'border-border bg-surface placeholder:text-subtle-foreground focus-visible:border-border-strong',
            error && 'border-destructive',
          )}
        />
        <button
          type="submit"
          disabled={isPending}
          aria-label="Subscribe"
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-full transition-opacity disabled:opacity-60',
            dark
              ? 'bg-primary-foreground text-primary'
              : 'bg-primary text-primary-foreground',
          )}
        >
          <ArrowRight className="size-4" strokeWidth={1.8} aria-hidden />
        </button>
      </div>

      {error ? (
        <p role="alert" className={cn('mt-2 text-xs', dark ? 'text-primary-foreground/80' : 'text-destructive')}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
