export type ProcessingTier = 'standard' | 'batch' | 'flex' | 'priority';

export interface ModelPricing {
  input: number; // Price per 1M tokens
  cached_input?: number; // Price per 1M cached tokens (if available)
  output: number; // Price per 1M tokens
}

export interface ModelPricingConfig {
  [tier: string]: ModelPricing;
}

export const OPENAI_PRICING: Record<string, ModelPricingConfig> = {
  // GPT-5 Series
  'gpt-5': {
    standard: { input: 1.25, cached_input: 0.125, output: 10.00 },
    batch: { input: 0.625, cached_input: 0.0625, output: 5.00 },
    flex: { input: 0.625, cached_input: 0.0625, output: 5.00 },
    priority: { input: 2.50, cached_input: 0.25, output: 20.00 }
  },
  'gpt-5-mini': {
    standard: { input: 0.25, cached_input: 0.025, output: 2.00 },
    batch: { input: 0.125, cached_input: 0.0125, output: 1.00 },
    flex: { input: 0.125, cached_input: 0.0125, output: 1.00 },
    priority: { input: 0.45, cached_input: 0.05, output: 3.60 }
  },
  'gpt-5-nano': {
    standard: { input: 0.05, cached_input: 0.005, output: 0.40 },
    batch: { input: 0.025, cached_input: 0.0025, output: 0.20 },
    flex: { input: 0.025, cached_input: 0.0025, output: 0.20 }
  },
  'gpt-5-chat-latest': {
    standard: { input: 1.25, cached_input: 0.125, output: 10.00 }
  },

  // GPT-4.1 Series
  'gpt-4.1': {
    standard: { input: 2.00, cached_input: 0.50, output: 8.00 },
    batch: { input: 1.00, output: 4.00 }
  },
  'gpt-4.1-mini': {
    standard: { input: 0.40, cached_input: 0.10, output: 1.60 },
    batch: { input: 0.20, output: 0.80 }
  },
  'gpt-4.1-nano': {
    standard: { input: 0.10, cached_input: 0.025, output: 0.40 },
    batch: { input: 0.05, output: 0.20 }
  },

  // GPT-4o Series
  'gpt-4o': {
    standard: { input: 2.50, cached_input: 1.25, output: 10.00 },
    batch: { input: 1.25, output: 5.00 }
  },
  'gpt-4o-2024-05-13': {
    standard: { input: 5.00, output: 15.00 },
    batch: { input: 2.50, output: 7.50 }
  },
  'gpt-4o-audio-preview': {
    standard: { input: 2.50, output: 10.00 }
  },
  'gpt-4o-realtime-preview': {
    standard: { input: 5.00, cached_input: 2.50, output: 20.00 }
  },
  'gpt-4o-mini': {
    standard: { input: 0.15, cached_input: 0.075, output: 0.60 },
    batch: { input: 0.075, output: 0.30 }
  },
  'gpt-4o-mini-audio-preview': {
    standard: { input: 0.15, output: 0.60 }
  },
  'gpt-4o-mini-realtime-preview': {
    standard: { input: 0.60, cached_input: 0.30, output: 2.40 }
  },
  'gpt-4o-mini-search-preview': {
    standard: { input: 0.15, output: 0.60 }
  },
  'gpt-4o-search-preview': {
    standard: { input: 2.50, output: 10.00 }
  },

  // O-Series Models
  'o1': {
    standard: { input: 15.00, cached_input: 7.50, output: 60.00 },
    batch: { input: 7.50, output: 30.00 }
  },
  'o1-pro': {
    standard: { input: 150.00, output: 600.00 },
    batch: { input: 75.00, output: 300.00 }
  },
  'o1-mini': {
    standard: { input: 1.10, cached_input: 0.55, output: 4.40 },
    batch: { input: 0.55, output: 2.20 }
  },

  // O3-Series Models
  'o3': {
    standard: { input: 2.00, cached_input: 0.50, output: 8.00 },
    batch: { input: 1.00, output: 4.00 },
    flex: { input: 1.00, cached_input: 0.25, output: 4.00 }
  },
  'o3-pro': {
    standard: { input: 20.00, output: 80.00 },
    batch: { input: 10.00, output: 40.00 }
  },
  'o3-deep-research': {
    standard: { input: 10.00, cached_input: 2.50, output: 40.00 },
    batch: { input: 5.00, output: 20.00 }
  },
  'o3-mini': {
    standard: { input: 1.10, cached_input: 0.55, output: 4.40 },
    batch: { input: 0.55, output: 2.20 }
  },

  // O4-Series Models
  'o4-mini': {
    standard: { input: 1.10, cached_input: 0.275, output: 4.40 },
    batch: { input: 0.55, output: 2.20 },
    flex: { input: 0.55, cached_input: 0.138, output: 2.20 }
  },
  'o4-mini-deep-research': {
    standard: { input: 2.00, cached_input: 0.50, output: 8.00 },
    batch: { input: 1.00, output: 4.00 }
  },

  // Other Models
  'computer-use-preview': {
    standard: { input: 3.00, output: 12.00 },
    batch: { input: 1.50, output: 6.00 }
  },
  'codex-mini-latest': {
    standard: { input: 1.50, cached_input: 0.375, output: 6.00 }
  },
  'gpt-image-1': {
    standard: { input: 5.00, cached_input: 1.25, output: 0 }
  },

  // Legacy Models - Standard Tier
  'chatgpt-4o-latest': {
    standard: { input: 5.00, output: 15.00 }
  },
  'gpt-4-turbo-2024-04-09': {
    standard: { input: 10.00, output: 30.00 },
    batch: { input: 5.00, output: 15.00 }
  },
  'gpt-4-0125-preview': {
    standard: { input: 10.00, output: 30.00 },
    batch: { input: 5.00, output: 15.00 }
  },
  'gpt-4-1106-preview': {
    standard: { input: 10.00, output: 30.00 },
    batch: { input: 5.00, output: 15.00 }
  },
  'gpt-4-1106-vision-preview': {
    standard: { input: 10.00, output: 30.00 },
    batch: { input: 5.00, output: 15.00 }
  },
  'gpt-4-0613': {
    standard: { input: 30.00, output: 60.00 },
    batch: { input: 15.00, output: 30.00 }
  },
  'gpt-4-0314': {
    standard: { input: 30.00, output: 60.00 },
    batch: { input: 15.00, output: 30.00 }
  },
  'gpt-4-32k': {
    standard: { input: 60.00, output: 120.00 },
    batch: { input: 30.00, output: 60.00 }
  },
  'gpt-3.5-turbo': {
    standard: { input: 0.50, output: 1.50 }
  },
  'gpt-3.5-turbo-0125': {
    standard: { input: 0.50, output: 1.50 },
    batch: { input: 0.25, output: 0.75 }
  },
  'gpt-3.5-turbo-1106': {
    standard: { input: 1.00, output: 2.00 },
    batch: { input: 1.00, output: 2.00 }
  },
  'gpt-3.5-turbo-0613': {
    standard: { input: 1.50, output: 2.00 },
    batch: { input: 1.50, output: 2.00 }
  },
  'gpt-3.5-0301': {
    standard: { input: 1.50, output: 2.00 },
    batch: { input: 1.50, output: 2.00 }
  },
  'gpt-3.5-turbo-instruct': {
    standard: { input: 1.50, output: 2.00 }
  },
  'gpt-3.5-turbo-16k-0613': {
    standard: { input: 3.00, output: 4.00 },
    batch: { input: 1.50, output: 2.00 }
  },
  'davinci-002': {
    standard: { input: 2.00, output: 2.00 },
    batch: { input: 1.00, output: 1.00 }
  },
  'babbage-002': {
    standard: { input: 0.40, output: 0.40 },
    batch: { input: 0.20, output: 0.20 }
  }
};

export const DEFAULT_TIER: ProcessingTier = 'standard';

export function isValidModel(model: string): boolean {
  return model in OPENAI_PRICING;
}

export function isValidTier(tier: string): tier is ProcessingTier {
  return ['standard', 'batch', 'flex', 'priority'].includes(tier);
}

export function getAvailableTiers(model: string): ProcessingTier[] {
  if (!isValidModel(model)) return [];
  return Object.keys(OPENAI_PRICING[model]) as ProcessingTier[];
}