export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards?: DisplayCardData[];
  timestamp: Date;
}

export interface DisplayCardData {
  title: string;
  description: string;
  date?: string;
  link?: string;
  icon?: string;
  type?: "project" | "event" | "issue" | "contributor" | "chapter";
}

export interface AIConfig {
  provider: "huggingface";
  model: string;
  apiKey: string;
}

export interface NestAPIResponse {
  projects?: any[];
  events?: any[];
  issues?: any[];
  contributors?: any[];
  chapters?: any[];
}

export interface ChatRequest {
  message: string;
  config: AIConfig;
}

export interface ChatResponse {
  message: string;
  cards?: DisplayCardData[];
}
