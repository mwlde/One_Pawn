import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

// Square corners, hairline borders, ink fill for the primary action. Straight
// from the wireframe's legend: there is exactly one primary action per screen.
const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-ink text-panel font-semibold border border-ink hover:bg-black disabled:bg-hairline disabled:border-hairline",
  secondary:
    "bg-transparent text-ink border border-ink hover:bg-tint disabled:text-hairline disabled:border-hairline disabled:hover:bg-transparent",
};

export function Button({ variant = "secondary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`px-5 py-3.5 text-sm leading-none transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
