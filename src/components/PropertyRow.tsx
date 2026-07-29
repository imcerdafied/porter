import type { PropertySummary } from "../hooks/usePortfolio";

export function PropertyRow({ summary }: { summary: PropertySummary }) {
  return <tr>
    <th scope="row"><a href={`/dashboard?property=${encodeURIComponent(summary.property_id)}`}>{summary.property_name}</a></th>
    <td>{summary.conversations_30d.toLocaleString()}</td>
    <td>{summary.avg_guest_rating == null ? "—" : summary.avg_guest_rating.toFixed(1)}</td>
    <td>{summary.coverage_gap ? <span className="portfolio-gap">Needs attention</span> : "Covered"}</td>
  </tr>;
}
