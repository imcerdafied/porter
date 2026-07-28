import { type FormEvent, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { contrastRatio } from "../lib/color";
import { porterApi } from "../lib/api";
import type { AdminProperty } from "../types";

export default function AdminKnowledgeBase({ slug }: { slug: string }) {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [property, setProperty] = useState<AdminProperty | null>(null);
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [accentColor, setAccentColor] = useState("#1a56db");
  const [logoUrl, setLogoUrl] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");
  const [message, setMessage] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const chatUrl = useMemo(
    () => `${window.location.origin}/${encodeURIComponent(slug)}`,
    [slug],
  );

  useEffect(() => {
    let current = true;
    if (!token) {
      setStatus("error");
      setMessage("This admin link is missing its access token.");
      return;
    }
    porterApi.adminProperty({ slug, token, action: "read" })
      .then((result) => {
        if (!current) return;
        setProperty(result);
        setKnowledgeBase(result.knowledge_base);
        setAccentColor(result.accent_color);
        setLogoUrl(result.logo_url ?? "");
        setStatus("idle");
      })
      .catch(() => {
        if (!current) return;
        setStatus("error");
        setMessage("This admin link is invalid or has expired.");
      });
    return () => {
      current = false;
    };
  }, [slug, token]);

  useEffect(() => {
    QRCode.toDataURL(chatUrl, {
      width: 512,
      margin: 2,
      color: { dark: "#12372a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setQrDataUrl);
  }, [chatUrl]);

  const lowContrast = /^#[0-9a-fA-F]{6}$/.test(accentColor) &&
    contrastRatio(accentColor, "#ffffff") < 4.5;

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const updated = await porterApi.adminProperty({
        slug,
        token,
        action: "update",
        knowledge_base: knowledgeBase,
        accent_color: accentColor,
        logo_url: logoUrl,
      });
      setProperty(updated);
      setStatus("saved");
      setMessage("Changes saved. New concierge replies will use them immediately.");
    } catch {
      setStatus("error");
      setMessage("We couldn't save those changes. Please try again.");
    }
  }

  if (status === "loading") {
    return <main className="centered-state" aria-busy="true"><div className="loading-ring" /></main>;
  }
  if (!property) {
    return <main className="centered-state"><h1>Admin link unavailable</h1><p>{message}</p></main>;
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <a href="/" className="porter-wordmark"><span>P</span> Porter</a>
        <p>Property setup</p>
      </header>
      <div className="admin-layout">
        <section className="admin-main">
          <p className="eyebrow">Property concierge</p>
          <h1>{property.name}</h1>
          <p className="admin-lede">
            Keep the information below current. Porter uses only these facts when answering guests.
          </p>
          <form className="admin-form" onSubmit={save}>
            <div className="field">
              <label htmlFor="knowledge-base">Knowledge base</label>
              <p>Include hours, policies, amenities, dining details, and common guest questions.</p>
              <textarea
                id="knowledge-base"
                onChange={(event) => setKnowledgeBase(event.target.value)}
                value={knowledgeBase}
                rows={18}
              />
              <span>{knowledgeBase.length.toLocaleString()} characters</span>
            </div>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="accent-color">Accent color</label>
                <div className="color-control">
                  <input
                    aria-label="Choose accent color"
                    type="color"
                    value={accentColor}
                    onChange={(event) => setAccentColor(event.target.value)}
                  />
                  <input
                    id="accent-color"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    value={accentColor}
                    onChange={(event) => setAccentColor(event.target.value)}
                  />
                </div>
                {lowContrast && (
                  <p className="contrast-warning" role="alert">
                    This color is low contrast on white. Choose a darker accent for readable text.
                  </p>
                )}
              </div>
              <div className="field">
                <label htmlFor="logo-url">Logo URL</label>
                <input
                  id="logo-url"
                  type="url"
                  placeholder="https://…"
                  value={logoUrl}
                  onChange={(event) => setLogoUrl(event.target.value)}
                />
              </div>
            </div>
            <div className="save-row">
              <button className="primary-button" disabled={status === "saving"} type="submit">
                {status === "saving" ? "Saving…" : "Save changes"}
              </button>
              {message && <p className={`save-message save-message--${status}`} role="status">{message}</p>}
            </div>
          </form>
        </section>

        <aside className="qr-card">
          <p className="eyebrow">Guest entry point</p>
          <h2>Print your QR code</h2>
          <p>Guests scan once—no download or login required.</p>
          {qrDataUrl && <img src={qrDataUrl} alt={`QR code for ${property.name} concierge`} />}
          <a href={chatUrl} target="_blank" rel="noreferrer">{chatUrl}</a>
          <button className="secondary-button" type="button" onClick={() => window.print()}>
            Print QR
          </button>
        </aside>
      </div>
    </main>
  );
}
