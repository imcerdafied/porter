import type { DateRange } from "../hooks/useDashboardStats";

const OPTIONS: { value: DateRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

export function DateRangeSelector({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  return <fieldset className="range-selector">
    <legend>Date range</legend>
    {OPTIONS.map((option) => <button key={option.value} type="button"
      aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
      {option.label}
    </button>)}
  </fieldset>;
}
