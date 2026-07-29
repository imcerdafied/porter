import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface KnowledgeTemplate { id: string; portfolio_id: string; title: string; body: string; category: string; created_at: string; updated_at: string; deployment_count: number }
export function buildDeploymentRows(templateId: string, propertyIds: string[], userId: string) {
  return propertyIds.map((property_id) => ({ template_id: templateId, property_id, deployed_by: userId }));
}
export function useKnowledgeTemplates(portfolioId: string | null) {
  const [templates, setTemplates] = useState<KnowledgeTemplate[]>([]);
  const [loading, setLoading] = useState(Boolean(portfolioId));
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!portfolioId) { setTemplates([]); setLoading(false); return; }
    setLoading(true);
    const { data, error: queryError } = await supabase.from("knowledge_templates").select("*,knowledge_template_deployments(count)").eq("portfolio_id", portfolioId).order("created_at", { ascending: false });
    if (queryError) setError("Could not load templates. Try again.");
    else setTemplates((data ?? []).map((item: any) => ({ ...item, deployment_count: Number(item.knowledge_template_deployments?.[0]?.count ?? 0) })));
    setLoading(false);
  }, [portfolioId]);
  useEffect(() => { void load(); }, [load]);
  async function createTemplate(title: string, body: string, category: string) {
    if (!portfolioId) return { error: "Create a portfolio before adding templates." };
    const { data, error: mutationError } = await supabase.from("knowledge_templates").insert({ portfolio_id: portfolioId, title, body, category }).select().single();
    if (mutationError || !data) return { error: "Could not save template. Try again." };
    setTemplates((current) => [{ ...data, deployment_count: 0 } as KnowledgeTemplate, ...current]);
    console.info("[portfolio]", "template_created", { portfolio_id: portfolioId, timestamp: new Date().toISOString() });
    return { error: null };
  }
  async function updateTemplate(id: string, title: string, body: string, category: string) {
    const { data, error: mutationError } = await supabase.from("knowledge_templates").update({ title, body, category }).eq("id", id).select().single();
    if (mutationError || !data) return { error: "Could not save template. Try again." };
    setTemplates((current) => current.map((item) => item.id === id ? { ...item, ...data } : item)); return { error: null };
  }
  async function deleteTemplate(id: string) {
    const { error: mutationError } = await supabase.from("knowledge_templates").delete().eq("id", id);
    if (mutationError) return { error: "Could not delete template. Try again." };
    setTemplates((current) => current.filter((item) => item.id !== id)); return { error: null };
  }
  async function deployTemplate(templateId: string, propertyIds: string[]) {
    if (!propertyIds.length) return { error: "Select at least one property." };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Please sign in to push a template." };
    const { error: mutationError } = await supabase.from("knowledge_template_deployments").upsert(buildDeploymentRows(templateId, propertyIds, user.id), { onConflict: "template_id,property_id", ignoreDuplicates: true });
    if (mutationError) return { error: "Could not push template. Try again." };
    await load(); console.info("[portfolio]", "template_deployed", { portfolio_id: portfolioId, timestamp: new Date().toISOString(), property_count: propertyIds.length });
    return { error: null };
  }
  return { templates, loading, error, createTemplate, updateTemplate, deleteTemplate, deployTemplate };
}
