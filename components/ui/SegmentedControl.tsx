"use client";

type Option<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

// The one-of-N picker the setup screen uses three times over. Rendered as a
// radiogroup rather than a row of buttons so arrow keys and screen readers
// treat it as the single choice it is.
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div>
      <div className="mb-1.5 text-xs text-graphite md:mb-2">{label}</div>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex overflow-hidden rounded border border-rule"
      >
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`flex-1 whitespace-nowrap px-2 py-2.5 text-sm transition-colors md:py-3 ${
                index > 0 ? "border-l border-rule" : ""
              } ${
                // An inset outline rather than a border, so the selected edge
                // sits over the shared dividers without shifting the layout.
                selected
                  ? "bg-surface-sunk font-medium text-ink outline outline-1 -outline-offset-1 outline-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  : "bg-transparent text-graphite hover:bg-surface-sunk"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
