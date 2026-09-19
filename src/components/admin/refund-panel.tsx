'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createRefundAction } from '@/actions/admin/orders';
import type { RefundableSummary } from '@/server/services/refund.service';
import { formatMoney, toMajorUnits, toMinorUnits } from '@/lib/money';
import { siteConfig } from '@/config/site';

/**
 * Refunds on an order.
 *
 * Money is not moved from here — no gateway is connected — so this records a
 * transfer someone made by hand, and says as much in the dialog. What it does
 * enforce is the arithmetic: never more than was captured, and stock only
 * comes back for the pieces that physically came back.
 */
export function RefundPanel({
  orderId,
  summary,
}: {
  orderId: string;
  summary: RefundableSummary;
}) {
  const [open, setOpen] = useState(false);

  const money = (amount: number) => formatMoney(amount, summary.currency, siteConfig.locale);
  const dateFormat = new Intl.DateTimeFormat(siteConfig.locale, { dateStyle: 'medium' });

  return (
    <section className="rounded-lg border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg">Refunds</h2>

        {summary.refundable > 0 ? (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Record refund
          </Button>
        ) : summary.captured > 0 ? (
          <Badge variant="neutral">Fully refunded</Badge>
        ) : null}
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Captured</dt>
          <dd className="tabular-nums">{money(summary.captured)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Refunded</dt>
          <dd className="tabular-nums">{money(summary.refunded)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t pt-1.5">
          <dt>Left to refund</dt>
          <dd className="tabular-nums">{money(summary.refundable)}</dd>
        </div>
      </dl>

      {summary.refunds.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t pt-4 text-xs">
          {summary.refunds.map((refund) => (
            <li key={refund.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="tabular-nums text-foreground">{money(refund.amount)}</p>
                {refund.reason ? (
                  <p className="text-muted-foreground">{refund.reason}</p>
                ) : null}
              </div>
              <p className="shrink-0 text-muted-foreground">
                {dateFormat.format(refund.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        {open ? (
          <DialogContent
            title="Record a refund"
            description="This records money you have already sent back. It does not move funds by itself."
          >
            <RefundForm
              orderId={orderId}
              summary={summary}
              onDone={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}

function RefundForm({
  orderId,
  summary,
  onDone,
  onCancel,
}: {
  orderId: string;
  summary: RefundableSummary;
  onDone: () => void;
  onCancel: () => void;
}) {
  const maxMajor = toMajorUnits(summary.refundable, summary.currency);

  const [amount, setAmount] = useState(String(maxMajor));
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [restock, setRestock] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) {
          setError('Enter an amount like 1499 or 1499.50.');
          return;
        }

        const minor = toMinorUnits(amount.trim(), summary.currency);
        if (minor <= 0) {
          setError('Enter an amount to refund.');
          return;
        }
        if (minor > summary.refundable) {
          setError(
            `That is more than the ${formatMoney(
              summary.refundable,
              summary.currency,
              siteConfig.locale,
            )} left to refund.`,
          );
          return;
        }

        startTransition(async () => {
          const result = await createRefundAction({
            orderId,
            amount: minor,
            reason,
            restock: Object.entries(restock)
              .filter(([, quantity]) => quantity > 0)
              .map(([orderItemId, quantity]) => ({ orderItemId, quantity })),
            notify,
          });

          if (result.ok) {
            toast.success(notify ? 'Refund recorded and customer notified' : 'Refund recorded');
            onDone();
          } else {
            setError(result.error.message);
          }
        });
      }}
    >
      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Field
        label={`Amount (${summary.currency})`}
        htmlFor="refundAmount"
        description={`Up to ${formatMoney(summary.refundable, summary.currency, siteConfig.locale)}`}
        required
      >
        <Input
          id="refundAmount"
          autoFocus
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>

      <Field
        label="Reason"
        htmlFor="refundReason"
        description="Shown on the order timeline and in the customer's email"
      >
        <Textarea
          id="refundReason"
          rows={2}
          maxLength={300}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Returned — did not fit"
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="label-caps mb-2">Back on the shelf</legend>
        <p className="mb-2 text-xs text-muted-foreground">
          Leave at zero for anything the customer keeps, or that came back damaged.
        </p>

        {summary.lines.map((line) => (
          <div
            key={line.orderItemId}
            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm">{line.title}</p>
              <p className="text-xs text-muted-foreground">
                {line.variantTitle} · {line.quantity} ordered
              </p>
            </div>

            <Input
              type="number"
              min={0}
              max={line.quantity}
              value={restock[line.orderItemId] ?? 0}
              aria-label={`Quantity of ${line.title} returned to stock`}
              onChange={(event) =>
                setRestock((current) => ({
                  ...current,
                  [line.orderItemId]: Math.max(
                    0,
                    Math.min(line.quantity, Number(event.target.value) || 0),
                  ),
                }))
              }
              className="h-9 w-20 shrink-0 text-center"
            />
          </div>
        ))}
      </fieldset>

      <div className="flex items-center gap-2.5">
        <Checkbox
          id="notifyRefund"
          checked={notify}
          onCheckedChange={(checked) => setNotify(checked === true)}
        />
        <Label htmlFor="notifyRefund" className="font-normal">
          Email the customer about this refund
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Record refund
        </Button>
      </div>
    </form>
  );
}
