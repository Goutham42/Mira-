'use client';

import { useState, useTransition } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { applyDiscountAction, removeDiscountAction } from '@/actions/cart';

export function DiscountForm({ appliedCode }: { appliedCode: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-md border border-accent/30 bg-accent-soft px-4 py-3">
        <p className="text-sm text-accent">
          Code <span className="font-medium">{appliedCode}</span> applied
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await removeDiscountAction();
              if (!result.ok) toast.error(result.error.message);
            })
          }
          className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          <X className="size-3.5" />
          Remove
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await applyDiscountAction({ code });
          if (result.ok) {
            setCode('');
            toast.success('Discount applied');
          } else {
            setError(result.error.message);
          }
        });
      }}
      className="max-w-sm"
    >
      <label htmlFor="discount-code" className="label-caps">
        Discount code
      </label>
      <div className="mt-2 flex gap-2">
        <Input
          id="discount-code"
          name="discount-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Enter code"
          autoComplete="off"
          maxLength={40}
          invalid={Boolean(error)}
          aria-describedby={error ? 'discount-error' : undefined}
        />
        <Button type="submit" variant="outline" loading={isPending} disabled={!code.trim()}>
          Apply
        </Button>
      </div>
      {error ? (
        <p id="discount-error" role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
