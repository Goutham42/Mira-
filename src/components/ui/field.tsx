import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';

/**
 * A labelled form control with description and error slots.
 *
 * Wires up `id`, `aria-describedby` and `aria-invalid` so every form in the
 * app is accessible by construction rather than by remembering to do it.
 */
export function Field({
  label,
  htmlFor,
  error,
  description,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  description?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const descriptionId = description ? `${htmlFor}-description` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>

      {description ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}

      {children}

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Props to spread onto the control inside a `Field`. */
export function fieldControlProps(id: string, error?: string, description?: string) {
  const describedBy = [description ? `${id}-description` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');

  return {
    id,
    name: id,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': describedBy || undefined,
  };
}
