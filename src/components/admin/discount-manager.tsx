'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  deleteDiscountAction,
  saveDiscountAction,
  setDiscountActiveAction,
} from '@/actions/admin/discounts';
import type { AdminDiscountRow } from '@/server/services/discount.service';
import { formatMoney, toMinorUnits } from '@/lib/money';
import { siteConfig } from '@/config/site';

/**
 * Discount code editor.
 *
 * Like the product form, this works in rupees and converts once on submit — a
 * merchant types 500, the database stores 50000 paise. The `type` field drives
 * which inputs are shown at all, because a free-shipping code with a
 * percentage box beside it is an invitation to set it wrong.
 */

const moneyField = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount like 500 or 499.50');

const formSchema = z
  .object({
    id: z.string().optional(),
    code: z
      .string()
      .trim()
      .min(3, 'Use at least 3 characters')
      .max(24, 'Keep the code under 24 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, dash and underscore only'),
    description: z.string().trim().max(200),
    type: z.enum(['PERCENT', 'FIXED', 'FREE_SHIPPING']),
    percentValue: z.string().trim(),
    fixedValue: z.string().trim(),
    minSubtotal: z.string().trim(),
    usageLimit: z.string().trim(),
    perUserLimit: z.string().trim(),
    startsAt: z.string().trim(),
    endsAt: z.string().trim(),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'PERCENT') {
      const percent = Number(data.percentValue);
      if (!/^\d{1,3}$/.test(data.percentValue) || percent < 1 || percent > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['percentValue'],
          message: 'Enter a whole percentage between 1 and 100',
        });
      }
    }

    if (data.type === 'FIXED' && !moneyField.safeParse(data.fixedValue).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fixedValue'],
        message: 'Enter the amount this code takes off, like 500',
      });
    }

    if (data.minSubtotal && !moneyField.safeParse(data.minSubtotal).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minSubtotal'],
        message: 'Enter an amount like 2000',
      });
    }

    for (const key of ['usageLimit', 'perUserLimit'] as const) {
      const value = data[key];
      if (value && !/^\d+$/.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: 'Whole number, or leave blank for no limit',
        });
      }
    }

    if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'The end date must be after the start date',
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

const BLANK: FormValues = {
  code: '',
  description: '',
  type: 'PERCENT',
  percentValue: '10',
  fixedValue: '',
  minSubtotal: '',
  usageLimit: '',
  perUserLimit: '1',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in local time, not an ISO string. */
function toLocalInput(date: Date | null): string {
  if (!date) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toFormValues(row: AdminDiscountRow): FormValues {
  return {
    id: row.id,
    code: row.code,
    description: row.description ?? '',
    type: row.type,
    percentValue: row.type === 'PERCENT' ? String(row.value) : '10',
    fixedValue: row.type === 'FIXED' ? String(row.value / 100) : '',
    minSubtotal: row.minSubtotal === null ? '' : String(row.minSubtotal / 100),
    usageLimit: row.usageLimit === null ? '' : String(row.usageLimit),
    perUserLimit: row.perUserLimit === null ? '' : String(row.perUserLimit),
    startsAt: toLocalInput(row.startsAt),
    endsAt: toLocalInput(row.endsAt),
    isActive: row.isActive,
  };
}

function describeValue(row: AdminDiscountRow): string {
  switch (row.type) {
    case 'PERCENT':
      return `${row.value}% off`;
    case 'FIXED':
      return `${formatMoney(row.value, siteConfig.currency, siteConfig.locale)} off`;
    case 'FREE_SHIPPING':
      return 'Free shipping';
  }
}

export function DiscountManager({ discounts }: { discounts: AdminDiscountRow[] }) {
  const [editing, setEditing] = useState<FormValues | null>(null);
  const [isPending, startTransition] = useTransition();

  const dateFormat = new Intl.DateTimeFormat(siteConfig.locale, { dateStyle: 'medium' });

  function windowLabel(row: AdminDiscountRow): string {
    if (row.startsAt && row.endsAt) {
      return `${dateFormat.format(row.startsAt)} – ${dateFormat.format(row.endsAt)}`;
    }
    if (row.endsAt) return `Until ${dateFormat.format(row.endsAt)}`;
    if (row.startsAt) return `From ${dateFormat.format(row.startsAt)}`;
    return 'Always';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Discounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Codes shoppers type at the cart. Every limit is checked again when the order is placed.
          </p>
        </div>

        <Button onClick={() => setEditing(BLANK)}>
          <Plus />
          New code
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Worth</TableHead>
            <TableHead>Conditions</TableHead>
            <TableHead>Used</TableHead>
            <TableHead>State</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {discounts.length === 0 ? (
            <TableEmpty colSpan={6}>
              No discount codes yet. Create one and it works at the cart immediately.
            </TableEmpty>
          ) : (
            discounts.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <span className="block font-mono font-medium">{row.code}</span>
                  {row.description ? (
                    <span className="block text-xs text-muted-foreground">{row.description}</span>
                  ) : null}
                </TableCell>

                <TableCell className="whitespace-nowrap">{describeValue(row)}</TableCell>

                <TableCell className="text-xs text-muted-foreground">
                  <span className="block">
                    {row.minSubtotal
                      ? `Min ${formatMoney(row.minSubtotal, siteConfig.currency, siteConfig.locale)}`
                      : 'No minimum'}
                  </span>
                  <span className="block">{windowLabel(row)}</span>
                  <span className="block">
                    {row.perUserLimit
                      ? `${row.perUserLimit} per customer`
                      : 'Unlimited per customer'}
                  </span>
                </TableCell>

                <TableCell className="tabular-nums">
                  {row.usageCount}
                  {row.usageLimit === null ? '' : ` / ${row.usageLimit}`}
                </TableCell>

                <TableCell>
                  {row.isRedeemable ? (
                    <Badge variant="success">Live</Badge>
                  ) : row.isActive ? (
                    <Badge variant="warning">Not redeemable</Badge>
                  ) : (
                    <Badge variant="neutral">Off</Badge>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex justify-end gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditing(toFormValues(row))}
                      className="underline underline-offset-4 hover:text-accent"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await setDiscountActiveAction({
                            id: row.id,
                            isActive: !row.isActive,
                          });
                          if (result.ok) {
                            toast.success(row.isActive ? 'Code switched off' : 'Code is live');
                          } else {
                            toast.error(result.error.message);
                          }
                        })
                      }
                      className="underline underline-offset-4 hover:text-accent"
                    >
                      {row.isActive ? 'Turn off' : 'Turn on'}
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await deleteDiscountAction({ id: row.id });
                          if (result.ok) toast.success('Code deleted');
                          else toast.error(result.error.message);
                        })
                      }
                      className="text-destructive underline underline-offset-4"
                    >
                      Delete
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing ? (
          <DialogContent
            title={editing.id ? `Edit ${editing.code}` : 'New discount code'}
            description="Shoppers type this at the cart. Limits are re-checked when the order is placed."
          >
            <DiscountForm
              defaults={editing}
              onSaved={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function DiscountForm({
  defaults,
  onSaved,
  onCancel,
}: {
  defaults: FormValues;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
  });

  const type = watch('type');
  const isActive = watch('isActive');
  const currency = siteConfig.currency;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        setFormError(null);

        const result = await saveDiscountAction({
          id: values.id || undefined,
          code: values.code,
          description: values.description,
          type: values.type,
          value:
            values.type === 'PERCENT'
              ? Number(values.percentValue)
              : values.type === 'FIXED'
                ? toMinorUnits(values.fixedValue, currency)
                : 0,
          minSubtotal: values.minSubtotal ? toMinorUnits(values.minSubtotal, currency) : '',
          usageLimit: values.usageLimit,
          perUserLimit: values.perUserLimit,
          startsAt: values.startsAt,
          endsAt: values.endsAt,
          isActive: values.isActive,
        });

        if (result.ok) {
          toast.success('Discount saved');
          onSaved();
        } else {
          setFormError(result.error.message);
        }
      })}
    >
      {formError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <input type="hidden" {...register('id')} />

      <Field label="Code" htmlFor="code" error={errors.code?.message} required>
        <Input
          id="code"
          autoFocus
          autoCapitalize="characters"
          className="font-mono uppercase"
          placeholder="DIWALI20"
          invalid={Boolean(errors.code)}
          {...register('code')}
        />
      </Field>

      <Field
        label="Description"
        htmlFor="discountDescription"
        error={errors.description?.message}
        description="Internal note — shoppers never see this"
      >
        <Input
          id="discountDescription"
          placeholder="Festive campaign"
          {...register('description')}
        />
      </Field>

      <Field label="Type" htmlFor="type" error={errors.type?.message} required>
        <select
          id="type"
          className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
          {...register('type')}
        >
          <option value="PERCENT">Percentage off</option>
          <option value="FIXED">Fixed amount off</option>
          <option value="FREE_SHIPPING">Free shipping</option>
        </select>
      </Field>

      {type === 'PERCENT' ? (
        <Field
          label="Percentage off"
          htmlFor="percentValue"
          error={errors.percentValue?.message}
          required
        >
          <Input
            id="percentValue"
            inputMode="numeric"
            placeholder="20"
            invalid={Boolean(errors.percentValue)}
            {...register('percentValue')}
          />
        </Field>
      ) : null}

      {type === 'FIXED' ? (
        <Field
          label={`Amount off (${currency})`}
          htmlFor="fixedValue"
          error={errors.fixedValue?.message}
          required
        >
          <Input
            id="fixedValue"
            inputMode="decimal"
            placeholder="500"
            invalid={Boolean(errors.fixedValue)}
            {...register('fixedValue')}
          />
        </Field>
      ) : null}

      <Field
        label={`Minimum order (${currency})`}
        htmlFor="minSubtotal"
        error={errors.minSubtotal?.message}
        description="Leave blank for no minimum"
      >
        <Input
          id="minSubtotal"
          inputMode="decimal"
          placeholder="2000"
          {...register('minSubtotal')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Total uses"
          htmlFor="usageLimit"
          error={errors.usageLimit?.message}
          description="Blank = unlimited"
        >
          <Input id="usageLimit" inputMode="numeric" placeholder="100" {...register('usageLimit')} />
        </Field>

        <Field
          label="Uses per customer"
          htmlFor="perUserLimit"
          error={errors.perUserLimit?.message}
          description="Blank = unlimited"
        >
          <Input id="perUserLimit" inputMode="numeric" placeholder="1" {...register('perUserLimit')} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" htmlFor="startsAt" error={errors.startsAt?.message}>
          <Input id="startsAt" type="datetime-local" {...register('startsAt')} />
        </Field>

        <Field label="Ends" htmlFor="endsAt" error={errors.endsAt?.message}>
          <Input id="endsAt" type="datetime-local" {...register('endsAt')} />
        </Field>
      </div>

      <div className="flex items-center gap-2.5">
        <Checkbox
          id="discountActive"
          checked={isActive}
          onCheckedChange={(checked) => setValue('isActive', checked === true)}
        />
        <Label htmlFor="discountActive" className="font-normal">
          Accept this code at the cart
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Save code
        </Button>
      </div>
    </form>
  );
}
