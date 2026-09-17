import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

// Square corners, hairline borders, ink fill for the primary action. Straight
// from the wireframe's legend: there is exactly one primary action per screen.
// A disabled button fades rather than recolouring to hairline. Recolouring
// took the label with it, which made a disabled button carrying live text
// ("Saving...") hard to read. The hover rules are pinned back to each
// variant's own background, so a disabled button does not react to a pointer.
const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-ink text-panel font-semibold border border-ink hover:bg-black disabled:hover:bg-ink",
  secondary:
    "bg-transparent text-ink border border-ink hover:bg-tint disabled:hover:bg-transparent",
};

export function Button({ variant = "secondary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`px-5 py-3.5 text-sm leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
