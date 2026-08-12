import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Text input.
 *
 * Height clears the 44px tap target. `aria-invalid` drives the error styling so
 * an error is never communicated by colour alone (WCAG 1.4.1).
 */
export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'bg-panel border-border text-text placeholder:text-text-subtle h-11 w-full rounded-md border px-3 py-2 text-base',
        'transition-colors outline-none',
        'focus-visible:border-primary focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:outline-danger',
        'file:text-text file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, rows = 5, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'bg-panel border-border text-text placeholder:text-text-subtle w-full rounded-md border px-3 py-2 text-base',
        'transition-colors outline-none',
        'focus-visible:border-primary focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:outline-danger',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
