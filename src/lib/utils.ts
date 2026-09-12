import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names, resolving conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function absoluteUrl(path: string, base: string) {
  return new URL(path, base).toString();
}

/** Clamp to a range; used wherever user input drives a quantity or page size. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function truncate(value: string, length: number) {
  return value.length <= length ? value : `${value.slice(0, length - 1).trimEnd()}\u2026`;
}
