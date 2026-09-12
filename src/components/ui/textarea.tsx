import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.ComponentProps<'textarea'> & { invalid?: boolean };

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        'flex min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm',
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
