'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { adjustStockAction } from '@/actions/admin/catalog';

/**
 * Stock adjustment.
 *
 * Takes a delta, not an absolute value. Every change is written to the
 * StockMovement ledger, so "why is this number 3?" always has an answer.
 */
export function StockAdjuster({
  variantId,
  label,
  currentQuantity,
}: {
  variantId: string;
  label: string;
  currentQuantity: number;
}) {
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsedDelta = Number(delta);
  const valid = Number.isInteger(parsedDelta) && parsedDelta !== 0;
  const projected = currentQuantity + (Number.isFinite(parsedDelta) ? parsedDelta : 0);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await adjustStockAction({
        variantId,
        delta: parsedDelta,
        reason: parsedDelta > 0 ? 'RESTOCK' : 'ADJUSTMENT',
        note,
      });

      if (result.ok) {
        toast.success(`Stock updated to ${result.data.quantity}`);
        setOpen(false);
        setDelta('');
        setNote('');
      } else {
        setError(result.error.message);
      }
    });
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Adjust
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Adjust stock" description={label}>
          <div className="space-y-4">
            {error ? (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Field
              label="Change"
              htmlFor="delta"
              description={`Currently ${currentQuantity}. Use a negative number to reduce.`}
              required
            >
              <Input
                id="delta"
                inputMode="numeric"
                placeholder="e.g. 12 or -3"
                value={delta}
                onChange={(event) => setDelta(event.target.value)}
                autoFocus
              />
            </Field>

            {valid ? (
              <p className="text-sm text-muted-foreground">
                New quantity will be{' '}
                <span className={projected < 0 ? 'text-destructive' : 'text-foreground'}>
                  {projected}
                </span>
              </p>
            ) : null}

            <Field label="Note" htmlFor="note" description="Recorded on the stock ledger">
              <Input
                id="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={200}
                placeholder="Received from supplier, damaged unit…"
              />
            </Field>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                loading={isPending}
                disabled={!valid || projected < 0}
                onClick={submit}
              >
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
