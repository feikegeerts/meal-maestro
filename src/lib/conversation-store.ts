import { loadWithTTL, removeStored, saveWithTTL } from "./session-storage";

export type PersistedChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

export interface PersistedConversationState {
  messages: PersistedChatMessage[];
  input?: string;
  isExpanded?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ConversationStoreOptions {
  userId?: string | null;
  locale: string;
  ttlMs?: number;
  version?: number;
}

export interface ConversationStore {
  load: (conversationId: string) => PersistedConversationState | null;
  save: (conversationId: string, state: PersistedConversationState) => void;
  clear: (conversationId: string) => void;
}

const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_VERSION = 1;

const buildStorageKey = (
  opts: ConversationStoreOptions,
  conversationId: string
) => {
  const userKey = opts.userId || "anon";
  return `mm.chat.v${opts.version ?? DEFAULT_VERSION}.${userKey}.${opts.locale}.${conversationId}`;
};

export function createConversationStore(
  options: ConversationStoreOptions
): ConversationStore {
  const ttl = options.ttlMs ?? DEFAULT_TTL;
  const version = options.version ?? DEFAULT_VERSION;

  return {
    load(conversationId: string) {
      const key = buildStorageKey({ ...options, version }, conversationId);
      return (
        loadWithTTL<PersistedConversationState>(key, {
          ttlMs: ttl,
          version,
        }) || null
      );
    },
    save(conversationId: string, state: PersistedConversationState) {
      const key = buildStorageKey({ ...options, version }, conversationId);
      saveWithTTL(key, state, {
        ttlMs: ttl,
        version,
      });
    },
    clear(conversationId: string) {
      const key = buildStorageKey({ ...options, version }, conversationId);
      removeStored(key);
    },
  };
}

export const SHARED_BUILDER_CONVERSATION_ID = "meal-builder";

