'use client';

import { useMemo, useState, useTransition } from 'react';
import { ExternalLink, Package, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { ShipmentStatus } from '@prisma/client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createShipmentAction,
  deleteShipmentAction,
  updateShipmentStatusAction,
} from '@/actions/admin/orders';
import type { ShipmentView, ShippableLine } from '@/server/services/shipment.service';
import { siteConfig } from '@/config/site';

/**
 * Parcels on an order.
 *
 * An order can go out in more than one box, so the form works line by line
 * against what is still unshipped rather than offering a single "mark as
 * shipped" button that would lie about a part dispatch.
 */

const STATUS_BADGE: Record<ShipmentStatus, { label: string; variant: 'neutral' | 'accent' | 'success' | 'warning' }> = {
  PENDING: { label: 'Packing', variant: 'neutral' },
  IN_TRANSIT: { label: 'In transit', variant: 'accent' },
  DELIVERED: { label: 'Delivered', variant: 'success' },
  RETURNED: { label: 'Returned', variant: 'warning' },
};

export function ShipmentPanel({
  orderId,
  shipments,
  shippable,
}: {
  orderId: string;
  shipments: ShipmentView[];
  shippable: ShippableLine[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const outstanding = useMemo(
    () => shippable.filter((line) => line.remaining > 0),
    [shippable],
  );

  const dateFormat = new Intl.DateTimeFormat(siteConfig.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  function run(
    action: () => Promise<{ ok: boolean; error?: { message: string } }>,
    success: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(result.error?.message ?? 'Something went wrong');
    });
  }

  return (
    <section className="rounded-lg border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg">Shipments</h2>

        {outstanding.length > 0 ? (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Create shipment
          </Button>
        ) : (
          <Badge variant="success">Everything shipped</Badge>
        )}
      </div>

      {shipments.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing has been dispatched yet. Creating a shipment records the tracking number and
          emails it to the customer.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {shipments.map((shipment) => {
            const badge = STATUS_BADGE[shipment.status];

            return (
              <li key={shipment.id} className="rounded-md border bg-surface-muted/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Package className="size-4 text-muted-foreground" aria-hidden />
                      <span className="text-sm font-medium">
                        {shipment.carrier ?? 'Shipment'}
                      </span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>

                    {shipment.trackingNumber ? (
                      <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                        {shipment.trackingNumber}
                      </p>
                    ) : null}

                    <p className="mt-1 text-xs text-muted-foreground">
                      {shipment.shippedAt
                        ? `Dispatched ${dateFormat.format(shipment.shippedAt)}`
                        : 'Not dispatched yet'}
                      {shipment.deliveredAt
                        ? ` · Delivered ${dateFormat.format(shipment.deliveredAt)}`
                        : ''}
                    </p>
                  </div>

                  {shipment.trackingUrl ? (
                    <a
                      href={shipment.trackingUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 text-xs underline underline-offset-4 hover:text-accent"
                    >
                      Track
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  ) : null}
                </div>

                <ul className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
                  {shipment.lines.map((line) => (
                    <li key={line.orderItemId}>
                      {line.title} · {line.variantTitle} × {line.quantity}
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  {shipment.status !== 'DELIVERED' ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        run(
                          () =>
                            updateShipmentStatusAction({
                              shipmentId: shipment.id,
                              orderId,
                              status: 'DELIVERED',
                            }),
                          'Marked delivered',
                        )
                      }
                      className="underline underline-offset-4 hover:text-accent"
                    >
                      Mark delivered
                    </button>
                  ) : null}

                  {shipment.status !== 'RETURNED' ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        run(
                          () =>
                            updateShipmentStatusAction({
                              shipmentId: shipment.id,
                              orderId,
                              status: 'RETURNED',
                            }),
                          'Marked returned',
                        )
                      }
                      className="underline underline-offset-4 hover:text-accent"
                    >
                      Mark returned
                    </button>
                  ) : null}

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      run(
                        () => deleteShipmentAction({ shipmentId: shipment.id, orderId }),
                        'Shipment removed',
                      )
                    }
                    className="text-destructive underline underline-offset-4"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        {open ? (
          <DialogContent
            title="Create shipment"
            description="Only what is still unshipped can be added to a parcel."
          >
            <ShipmentForm
              orderId={orderId}
              lines={outstanding}
              onDone={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}

function ShipmentForm({
  orderId,
  lines,
  onDone,
  onCancel,
}: {
  orderId: string;
  lines: ShippableLine[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(lines.map((line) => [line.orderItemId, line.remaining])),
  );
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  const total = Object.values(quantities).reduce((sum, value) => sum + value, 0);

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        const items = Object.entries(quantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

        if (items.length === 0) {
          setError('Choose at least one item to ship.');
          return;
        }

        startTransition(async () => {
          const result = await createShipmentAction({
            orderId,
            carrier,
            trackingNumber,
            trackingUrl,
            items,
            notify,
          });

          if (result.ok) {
            toast.success(notify ? 'Shipment created and customer notified' : 'Shipment created');
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

      <fieldset className="space-y-2">
        <legend className="label-caps mb-2">In this parcel</legend>

        {lines.map((line) => (
          <div
            key={line.orderItemId}
            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm">{line.title}</p>
              <p className="text-xs text-muted-foreground">
                {line.variantTitle} · {line.remaining} of {line.ordered} left to ship
              </p>
            </div>

            <Input
              type="number"
              min={0}
              max={line.remaining}
              value={quantities[line.orderItemId] ?? 0}
              aria-label={`Quantity of ${line.title} in this parcel`}
              onChange={(event) =>
                setQuantities((current) => ({
                  ...current,
                  [line.orderItemId]: Math.max(
                    0,
                    Math.min(line.remaining, Number(event.target.value) || 0),
                  ),
                }))
              }
              className="h-9 w-20 shrink-0 text-center"
            />
          </div>
        ))}
      </fieldset>

      <Field label="Carrier" htmlFor="carrier" description="Blue Dart, Delhivery, India Post…">
        <Input
          id="carrier"
          value={carrier}
          onChange={(event) => setCarrier(event.target.value)}
          placeholder="Delhivery"
        />
      </Field>

      <Field label="Tracking number" htmlFor="trackingNumber">
        <Input
          id="trackingNumber"
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
          className="font-mono"
        />
      </Field>

      <Field
        label="Tracking link"
        htmlFor="trackingUrl"
        description="Optional — the carrier's page for this consignment"
      >
        <Input
          id="trackingUrl"
          type="url"
          value={trackingUrl}
          onChange={(event) => setTrackingUrl(event.target.value)}
          placeholder="https://…"
        />
      </Field>

      <div className="flex items-center gap-2.5">
        <Checkbox
          id="notifyShipment"
          checked={notify}
          onCheckedChange={(checked) => setNotify(checked === true)}
        />
        <Label htmlFor="notifyShipment" className="font-normal">
          Email the customer with the tracking details
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={total === 0}>
          Create shipment
        </Button>
      </div>
    </form>
  );
}
