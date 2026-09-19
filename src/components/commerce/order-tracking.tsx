import { ExternalLink, PackageCheck, Truck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { OrderShipmentView } from '@/types/order';
import { siteConfig } from '@/config/site';

/**
 * Tracking, as the shopper sees it.
 *
 * "Where is my order" is the most common support question a shop gets, so the
 * answer belongs on the order page rather than in an email the customer has to
 * find again. Renders nothing at all until something has actually shipped.
 */
export function OrderTracking({ shipments }: { shipments: OrderShipmentView[] }) {
  if (shipments.length === 0) return null;

  const dateFormat = new Intl.DateTimeFormat(siteConfig.locale, { dateStyle: 'medium' });
  const multiple = shipments.length > 1;

  return (
    <section className="rounded-lg border bg-surface p-5">
      <h3 className="font-display text-lg">
        {multiple ? 'Your parcels' : 'Your parcel'}
      </h3>

      <ul className="mt-4 space-y-4">
        {shipments.map((shipment, index) => {
          const delivered = shipment.status === 'DELIVERED';
          const returned = shipment.status === 'RETURNED';
          const Icon = delivered ? PackageCheck : Truck;

          return (
            <li key={shipment.id} className="rounded-md border bg-surface-muted/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Icon
                  className={delivered ? 'size-4 text-success' : 'size-4 text-muted-foreground'}
                  aria-hidden
                />
                <span className="text-sm font-medium">
                  {multiple ? `Parcel ${index + 1}` : 'Parcel'}
                  {shipment.carrier ? ` · ${shipment.carrier}` : ''}
                </span>

                {delivered ? (
                  <Badge variant="success">Delivered</Badge>
                ) : returned ? (
                  <Badge variant="warning">Returned</Badge>
                ) : (
                  <Badge variant="accent">On its way</Badge>
                )}
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {delivered && shipment.deliveredAt
                  ? `Delivered ${dateFormat.format(shipment.deliveredAt)}`
                  : shipment.shippedAt
                    ? `Dispatched ${dateFormat.format(shipment.shippedAt)}`
                    : 'Being packed'}
              </p>

              {shipment.trackingNumber ? (
                <p className="mt-2 font-mono text-xs">
                  <span className="text-muted-foreground">Tracking </span>
                  {shipment.trackingNumber}
                </p>
              ) : null}

              <ul className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
                {shipment.lines.map((line) => (
                  <li key={line.orderItemId}>
                    {line.title} × {line.quantity}
                  </li>
                ))}
              </ul>

              {shipment.trackingUrl ? (
                <a
                  href={shipment.trackingUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs underline underline-offset-4 hover:text-accent"
                >
                  Track this parcel
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
