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
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        {label}
      </div>
      <div role="radiogroup" aria-label={label} className="flex border border-ink">
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`flex-1 px-4 py-3 text-sm transition-colors ${
                index > 0 ? "border-l border-ink" : ""
              } ${
                selected
                  ? "bg-ink font-semibold text-panel"
                  : "bg-transparent text-muted hover:bg-tint"
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
