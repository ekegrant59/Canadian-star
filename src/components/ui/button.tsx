import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button.
 *
 * Every value here resolves to a design token. No raw hex, no arbitrary pixel
 * values. Compact styling and the restrained radius system come from the
 * supplied comps.
 *
 * Sizes clear the 44x44 tap target used across the app: voting and application
 * flows are thumb-driven on phones, and WCAG 2.2 (2.5.8) sets a 24x24 floor
 * that this comfortably passes.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-medium transition-colors',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    'focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed',
        secondary: 'bg-panel text-text border border-border hover:bg-panel-raised',
        outline: 'border border-border-strong text-text bg-transparent hover:bg-panel',
        ghost: 'text-text-muted hover:bg-panel hover:text-text bg-transparent',
        link: 'text-primary underline-offset-4 hover:underline bg-transparent',
        danger: 'bg-danger text-text-inverse hover:opacity-90',
      },
      size: {
        sm: 'h-9 min-h-9 rounded-md px-3 text-sm',
        md: 'h-11 min-h-11 rounded-md px-5 text-sm',
        lg: 'h-12 min-h-12 rounded-lg px-7 text-base',
        icon: 'size-11 min-h-11 min-w-11 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      // Default to type="button". An unset type inside a form submits it,
      // which is a real bug in multi-step forms.
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
