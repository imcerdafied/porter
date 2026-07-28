export interface PropertyConfig {
  slug: string;
  name: string;
  logo_url: string | null;
  accent_color: string;
}

export interface AdminProperty extends PropertyConfig {
  knowledge_base: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}
