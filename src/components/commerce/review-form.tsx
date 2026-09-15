'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, fieldControlProps } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { submitReviewAction } from '@/actions/review';
import { cn } from '@/lib/utils';

const LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'] as const;

/**
 * Write-a-review form.
 *
 * Only rendered for shoppers who actually bought the piece — the eligibility
 * check happens on the server, and the action re-checks it, so this component
 * never has to be trusted.
 */
export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-lg border border-accent/30 bg-accent-soft/60 px-5 py-6 text-sm"
      >
        <p className="font-medium text-foreground">Thank you — your review is in.</p>
        <p className="mt-1 text-muted-foreground">
          We read every one before it goes live, so it may take a day to appear.
        </p>
      </div>
    );
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    startTransition(async () => {
      const result = await submitReviewAction({ productId, rating, title, body });

      if (result.ok) {
        setSubmitted(true);
        toast.success('Review submitted');
        return;
      }

      if (result.error.fields) setErrors(result.error.fields);
      toast.error(result.error.message);
    });
  }

  const shown = hovered || rating;

  return (
    <form onSubmit={onSubmit} className="rounded-lg border bg-surface p-5">
      <h3 className="font-display text-xl">Write a review</h3>

      <fieldset className="mt-4">
        <legend className="label-caps mb-2">Your rating</legend>
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHovered(0)}
          role="radiogroup"
          aria-label="Your rating"
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star} star${star === 1 ? '' : 's'} — ${LABELS[star - 1]}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onFocus={() => setHovered(star)}
              className="rounded p-0.5 transition-transform hover:scale-110"
            >
              <svg
                viewBox="0 0 24 24"
                fill={star <= shown ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={1.4}
                strokeLinejoin="round"
                aria-hidden
                className={cn(
                  'size-7 transition-colors',
                  star <= shown ? 'text-accent' : 'text-border-strong',
                )}
              >
                <path d="m12 3.2 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6L3.2 9.6l6.1-.9z" />
              </svg>
            </button>
          ))}

          <span className="ml-2 text-sm text-muted-foreground">
            {shown > 0 ? LABELS[shown - 1] : 'Tap a star'}
          </span>
        </div>
        {errors.rating ? (
          <p role="alert" className="mt-1.5 text-xs text-destructive">
            {errors.rating[0]}
          </p>
        ) : null}
      </fieldset>

      <div className="mt-5 space-y-4">
        <Field label="Title" htmlFor="title" error={errors.title?.[0]}>
          <Input
            {...fieldControlProps('title', errors.title?.[0])}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Sums up your experience"
            maxLength={120}
          />
        </Field>

        <Field
          label="Your review"
          htmlFor="body"
          required
          error={errors.body?.[0]}
          description="How is the fit, the fabric and the colour in person?"
        >
          <textarea
            {...fieldControlProps('body', errors.body?.[0], 'How is the fit, the fabric and the colour in person?')}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            maxLength={2000}
            className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground transition-colors focus-visible:border-border-strong aria-[invalid=true]:border-destructive"
            placeholder="Tell other shoppers what you think"
          />
        </Field>
      </div>

      <Button type="submit" className="mt-5" loading={isPending} disabled={rating === 0}>
        Submit review
      </Button>
    </form>
  );
}
