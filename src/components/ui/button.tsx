import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium',
    // Motion is part of the control, not decoration: the press scale is the
    // only instant feedback a shopper gets before the server responds.
    'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[var(--ease-soft)]',
    'active:scale-[0.97] active:duration-100',
    'disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:shadow-md',
        accent: 'bg-accent text-accent-foreground shadow-xs hover:bg-accent/90 hover:shadow-md',
        outline:
          'border border-border-strong bg-transparent hover:border-primary hover:bg-surface-muted',
        ghost: 'hover:bg-surface-muted',
        link: 'text-foreground underline underline-offset-4 hover:text-accent',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 hover:shadow-md',
      },
      size: {
        sm: 'h-9 px-3 text-xs [&_svg]:size-4',
        md: 'h-11 px-5 [&_svg]:size-4',
        lg: 'h-12 px-7 text-[0.9375rem] [&_svg]:size-5',
        icon: 'size-10 [&_svg]:size-4',
      },
      full: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  full,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    // Radix Slot requires exactly one element child, so the spinner slot must
    // not be rendered here at all — an `asChild` button wraps a link, which is
    // never in a loading state anyway.
    return (
      <Slot
        className={cn(buttonVariants({ variant, size, full }), className)}
        {...props}
      >
        {children}
      </Slot>
    );
  }

  return (
    <button
      className={cn(buttonVariants({ variant, size, full }), className)}
      disabled={disabled || loading}
      // Announce the busy state rather than only showing a spinner.
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export { buttonVariants };
