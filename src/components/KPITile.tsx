interface KPITileProps {
  label: string;
  value: number | null;
  format?: "number" | "percent" | "currency";
  loading?: boolean;
}

export function KPITile({ label, value, format = "number", loading = false }: KPITileProps) {
  const display = loading ? "…" : value === null ? "—" : format === "percent"
    ? `${value.toFixed(1)}%`
    : format === "currency" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
    : value.toLocaleString();

  return <article className="kpi-tile" aria-label={label} aria-busy={loading}>
    <strong className="kpi-tile__value" aria-live="polite">{display}</strong>
    <span className="kpi-tile__label">{label}</span>
  </article>;
}
