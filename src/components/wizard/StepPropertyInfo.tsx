import { useState } from "react";
import type { Property, PropertyInput } from "../../hooks/useProperty";

export function StepPropertyInfo({ property, onSubmit }: { property: Property | null; onSubmit: (input: PropertyInput) => Promise<unknown> }) {
  const [form, setForm] = useState<PropertyInput>({
    name: property?.name ?? "", address: property?.address ?? "", star_rating: property?.star_rating ?? 4,
    primary_language: property?.primary_language ?? "en", contact_email: property?.contact_email ?? "",
  });
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const field = (key: keyof PropertyInput, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return setError("Please enter your property name.");
    if (!form.address.trim()) return setError("Please enter your property address.");
    if (!/^\S+@\S+\.\S+$/.test(form.contact_email)) return setError("Please enter a valid contact email.");
    setSaving(true); setError("");
    try { await onSubmit(form); } catch (err) { setError(err instanceof Error ? err.message : "Could not save your property."); }
    finally { setSaving(false); }
  }
  return <section><h1>Tell us about your property</h1><p>We’ll use these details to tailor your concierge.</p>
    <form className="wizard-form" onSubmit={submit} noValidate>
      <label htmlFor="property-name">Property name</label><input id="property-name" value={form.name} onChange={(e) => field("name", e.target.value)} />
      <label htmlFor="property-address">Address</label><textarea id="property-address" value={form.address} onChange={(e) => field("address", e.target.value)} />
      <label htmlFor="star-rating">Star rating</label><select id="star-rating" value={form.star_rating} onChange={(e) => field("star_rating", Number(e.target.value))}>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}</select>
      <label htmlFor="primary-language">Primary language</label><select id="primary-language" value={form.primary_language} onChange={(e) => field("primary_language", e.target.value)}><option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="it">Italian</option><option value="pt">Portuguese</option></select>
      <label htmlFor="contact-email">Contact email</label><input id="contact-email" type="email" autoComplete="email" value={form.contact_email} onChange={(e) => field("contact_email", e.target.value)} />
      {error && <p role="alert" className="error-text">{error}</p>}
      <button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Continue →"}</button>
    </form></section>;
}
