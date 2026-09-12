import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.ComponentProps<'input'> & { invalid?: boolean };

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm',
        'placeholder:text-subtle-foreground',
        'transition-colors focus-visible:border-border-strong',
        'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60',
        'aria-[invalid=true]:border-destructive',
        className,
      )}
      {...props}
    />
  );
}
