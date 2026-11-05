export type Priority = "hot" | "warm" | "cold";

export interface LeadInput {
  name: string;
  location: string;
  requirement: string;
  budget: string;
  timeline: string;
  message: string;
}

export interface FollowUp {
  id: string;
  dayOffset: number; // days after lead creation
  channel: "call" | "whatsapp" | "email";
  action: string;
  message: string;
  done: boolean;
}

export interface Analysis {
  summary: string;
  intent: string;
  keyRequirements: string[];
  objections: string[];
  nextAction: string;
  suggestedResponse: string;
  score: number; // 1-10
  priority: Priority;
  scoreReason: string;
  followUps: Omit<FollowUp, "id" | "done">[];
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface Lead {
  id: string;
  createdAt: string; // ISO
  input: LeadInput;
  analysis: Analysis;
  followUps: FollowUp[];
  chat: ChatMessage[];
}