import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Label. Always associate with a control via htmlFor: WCAG 2.2 requires every
 * form control to be programmatically labelled, and a placeholder is not a label.
 */
export const Label = React.forwardRef<HTMLLabelElement, React.ComponentProps<'label'>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-text block text-sm leading-none font-medium', className)}
      {...props}
    />
  ),
);
Label.displayName = 'Label';

/** Field error. `role="alert"` announces it rather than relying on red text. */
export function FieldError({ className, children, ...props }: React.ComponentProps<'p'>) {
  if (!children) return null;
  return (
    <p role="alert" className={cn('text-danger text-sm', className)} {...props}>
      {children}
    </p>
  );
}

export function FieldHint({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-text-subtle text-sm', className)} {...props} />;
}
