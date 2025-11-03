import { z } from 'zod';

// Request schema for the chat filter API
export const ChatFilterRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

export type ChatFilterRequest = z.infer<typeof ChatFilterRequestSchema>;

// Response schema for the chat filter API
export const ChatFilterResponseSchema = z.object({
  text: z.string(),
  prediction: z.enum(['normal', 'spam', 'toxic']),
});

export type ChatFilterResponse = z.infer<typeof ChatFilterResponseSchema>;

// Internal message filter result
export interface MessageFilterResult {
  isSpam: boolean;
  isToxic: boolean;
  isNormal: boolean;
  confidence: number;
  prediction: 'normal' | 'spam' | 'toxic';
  shouldBlock: boolean;
  action: 'allow' | 'warn' | 'delete' | 'timeout';
}

// Configuration for message filtering
export interface MessageFilterConfig {
  enabled: boolean;
  spamThreshold: number; // 0.0 - 1.0
  toxicThreshold: number; // 0.0 - 1.0
  autoDelete: boolean;
  autoTimeout: boolean;
  timeoutDuration: number; // in minutes
  notifyModerators: boolean;
  logViolations: boolean;
}
