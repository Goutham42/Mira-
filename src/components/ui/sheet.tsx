'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Slide-over panel. Used for the cart drawer, mobile navigation and the
 * mobile filter panel — all three are the same interaction, so they share one
 * implementation.
 */
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

const sheetVariants = cva(
  'fixed z-50 flex flex-col gap-0 bg-surface shadow-xl',
  {
    variants: {
      side: {
        right: 'mira-panel-right inset-y-0 right-0 h-full w-full max-w-md border-l',
        left: 'mira-panel-left inset-y-0 left-0 h-full w-full max-w-sm border-r',
        bottom: 'mira-panel-bottom inset-x-0 bottom-0 max-h-[85dvh] rounded-t-lg border-t',
      },
    },
    defaultVariants: { side: 'right' },
  },
);

function SheetContent({
  className,
  side,
  title,
  description,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof sheetVariants> & {
    title: string;
    description?: string;
  }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="mira-overlay fixed inset-0 z-50 bg-foreground/25 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <DialogPrimitive.Title className="font-display text-lg">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </div>

        {/* Radix requires a description or an explicit opt-out for a11y. */}
        {description ? (
          <DialogPrimitive.Description className="sr-only">
            {description}
          </DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">
            {title}
          </DialogPrimitive.Description>
        )}

        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent };
