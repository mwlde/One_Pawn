import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

// One accent-filled action per screen; everything else is secondary. A
// disabled button fades rather than recolouring. Recolouring took the label
// with it, which made a disabled button carrying live text ("Saving...") hard
// to read. The hover rules are pinned back to each variant's own background,
// so a disabled button does not react to a pointer.
const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "border border-accent bg-accent font-medium text-on-accent hover:border-accent-hover hover:bg-accent-hover disabled:hover:border-accent disabled:hover:bg-accent",
  secondary:
    "border border-rule-strong bg-transparent text-ink hover:bg-surface-sunk disabled:hover:bg-transparent",
};

// Exported for links that look like buttons, so the two cannot drift apart.
export function buttonClasses(variant: Variant): string {
  return `inline-block rounded px-6 py-3 text-center text-sm leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASSES[variant]}`;
}

export function Button({ variant = "secondary", className = "", ...props }: ButtonProps) {
  return <button className={`${buttonClasses(variant)} ${className}`} {...props} />;
}
