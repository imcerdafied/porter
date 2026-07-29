interface KPITileProps {
  label: string;
  value: number | null;
  format?: "number" | "percent";
  loading?: boolean;
}

export function KPITile({ label, value, format = "number", loading = false }: KPITileProps) {
  const display = loading ? "…" : value === null ? "—" : format === "percent"
    ? `${value.toFixed(1)}%`
    : value.toLocaleString();

  return <article className="kpi-tile" aria-label={label} aria-busy={loading}>
    <strong className="kpi-tile__value" aria-live="polite">{display}</strong>
    <span className="kpi-tile__label">{label}</span>
  </article>;
}
