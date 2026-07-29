export interface PropertyConfig {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  accent_color: string;
  wayfinding_enabled: boolean;
  phunware_building_id: string | null;
}

export interface AdminProperty extends PropertyConfig {
  knowledge_base: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}
