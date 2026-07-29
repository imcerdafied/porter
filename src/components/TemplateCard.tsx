import { useState } from "react";
import type { KnowledgeTemplate } from "../hooks/useKnowledgeTemplates";
import type { PortfolioProperty } from "../hooks/usePortfolio";

interface Props {
  template: KnowledgeTemplate; properties: PortfolioProperty[]; canManage: boolean;
  onSave: (id: string, title: string, body: string, category: string) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
  onDeploy: (id: string, propertyIds: string[]) => Promise<string | null>;
}
export function TemplateCard({ template, properties, canManage, onSave, onDelete, onDeploy }: Props) {
  const [editing, setEditing] = useState(false); const [deploying, setDeploying] = useState(false);
  const [title, setTitle] = useState(template.title); const [body, setBody] = useState(template.body); const [category, setCategory] = useState(template.category);
  const [selected, setSelected] = useState<string[]>([]); const [message, setMessage] = useState("");
  async function save() { const error = await onSave(template.id, title, body, category); setMessage(error ?? "Template saved."); if (!error) setEditing(false); }
  async function deploy() { const error = await onDeploy(template.id, selected); setMessage(error ?? "Template pushed to selected properties."); if (!error) { setSelected([]); setDeploying(false); } }
  return <article className="template-card">
    {editing ? <div className="portfolio-form compact-form">
      <label htmlFor={`title-${template.id}`}>Title</label><input id={`title-${template.id}`} value={title} onChange={(event) => setTitle(event.target.value)} />
      <label htmlFor={`body-${template.id}`}>Answer</label><textarea id={`body-${template.id}`} rows={5} value={body} onChange={(event) => setBody(event.target.value)} />
      <label htmlFor={`category-${template.id}`}>Category</label><CategorySelect id={`category-${template.id}`} value={category} onChange={setCategory} />
      <div className="portfolio-actions"><button className="primary-button" type="button" onClick={() => void save()}>Save</button><button className="secondary-button" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
    </div> : <><div className="template-card__header"><div><p className="eyebrow">{template.category}</p><h2>{template.title}</h2></div><strong>{template.deployment_count} deployments</strong></div><p>{template.body}</p></>}
    {canManage && !editing && <div className="portfolio-actions"><button className="secondary-button" type="button" onClick={() => setEditing(true)}>Edit</button><button className="secondary-button" type="button" onClick={() => setDeploying(!deploying)}>Push to properties</button><button className="text-button danger-button" type="button" onClick={() => void onDelete(template.id).then((error) => setMessage(error ?? "Template deleted."))}>Delete</button></div>}
    {deploying && <fieldset className="property-picker"><legend>Select properties</legend>{properties.map((property) => { const id = `deploy-${template.id}-${property.property_id}`; return <div key={property.property_id}><input id={id} type="checkbox" checked={selected.includes(property.property_id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, property.property_id] : current.filter((value) => value !== property.property_id))} /><label htmlFor={id}>{property.name}</label></div>; })}<button className="primary-button" type="button" onClick={() => void deploy()}>Push to properties</button></fieldset>}
    {message && <p className={message.includes("Could not") || message.includes("Select") ? "error-text" : "success-text"} role="status">{message}</p>}
  </article>;
}

export const categories = ["general", "dining", "transport", "activities", "amenities"];
export function CategorySelect({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select>;
}
