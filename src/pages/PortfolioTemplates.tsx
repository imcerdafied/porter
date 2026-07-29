import { type FormEvent, useState } from "react";
import { PortfolioNav } from "../components/PortfolioNav";
import { CategorySelect, TemplateCard } from "../components/TemplateCard";
import { useKnowledgeTemplates } from "../hooks/useKnowledgeTemplates";
import { usePortfolio } from "../hooks/usePortfolio";

export default function PortfolioTemplates() {
  const portfolio = usePortfolio(); const templates = useKnowledgeTemplates(portfolio.portfolio?.id ?? null);
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [category, setCategory] = useState("general"); const [message, setMessage] = useState("");
  async function create(event: FormEvent) { event.preventDefault(); const result = await templates.createTemplate(title.trim(), body.trim(), category); setMessage(result.error ?? "Template created."); if (!result.error) { setTitle(""); setBody(""); setCategory("general"); } }
  if (portfolio.loading || templates.loading) return <main className="centered-state" aria-busy="true"><i className="loading-ring" /><p>Loading templates…</p></main>;
  if (!portfolio.portfolio) return <main className="centered-state"><h1>Portfolio not found</h1><a href="/portfolio">Create a portfolio</a></main>;
  return <main className="portfolio-shell"><div className="portfolio-page"><header className="portfolio-header"><div><p className="eyebrow">{portfolio.portfolio.name}</p><h1>Shared templates</h1></div></header><PortfolioNav />
    {(portfolio.error || templates.error) && <p className="error-text" role="alert">{portfolio.error ?? templates.error}</p>}
    {portfolio.canManage && <section className="portfolio-panel" aria-labelledby="create-template-title"><h2 id="create-template-title">Create template</h2><form className="portfolio-form" onSubmit={create}><label htmlFor="template-title">Title</label><input id="template-title" required value={title} onChange={(event) => setTitle(event.target.value)} /><label htmlFor="template-body">Answer</label><textarea id="template-body" required rows={6} value={body} onChange={(event) => setBody(event.target.value)} /><label htmlFor="template-category">Category</label><CategorySelect id="template-category" value={category} onChange={setCategory} /><button className="primary-button" type="submit">Create template</button>{message && <p className={message.startsWith("Could") ? "error-text" : "success-text"} role="status">{message}</p>}</form>{/* TODO: AI template generation edge function */}</section>}
    <section className="template-list" aria-label="Knowledge templates">{templates.templates.length === 0 ? <p className="portfolio-empty">No templates yet. Create a shared template to push answers to all your properties at once.</p> : templates.templates.map((template) => <TemplateCard key={template.id} template={template} properties={portfolio.properties} canManage={portfolio.canManage} onSave={async (...args) => (await templates.updateTemplate(...args)).error} onDelete={async (id) => (await templates.deleteTemplate(id)).error} onDeploy={async (id, ids) => (await templates.deployTemplate(id, ids)).error} />)}</section>
  </div></main>;
}
