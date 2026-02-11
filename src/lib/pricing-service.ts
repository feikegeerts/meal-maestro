import { 
  OPENAI_PRICING, 
  DEFAULT_TIER, 
  type ProcessingTier, 
  type ModelPricing,
  isValidModel,
  isValidTier 
} from './pricing-config';

export interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
  tier: ProcessingTier;
  promptTokens: number;
  completionTokens: number;
}

export interface UsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
}

export class PricingService {
  private readonly pricingConfig = OPENAI_PRICING;
  private modelPricingCache = new Map<string, ModelPricing | null>();
  
  public getModelPricing(model: string, tier: ProcessingTier = DEFAULT_TIER): ModelPricing | null {
    const cacheKey = `${model}:${tier}`;
    
    // Check cache first
    if (this.modelPricingCache.has(cacheKey)) {
      const cachedResult = this.modelPricingCache.get(cacheKey);
      if (cachedResult !== undefined) {
        return cachedResult;
      }
    }
    let result: ModelPricing | null;
    
    if (!isValidModel(model)) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`🟡 [PricingService] Unknown model: ${model}`);
      }
      result = null;
    } else {
      const modelConfig = this.pricingConfig[model];
      if (!modelConfig[tier]) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn(`🟡 [PricingService] Tier ${tier} not available for model ${model}, falling back to standard`);
        }
        result = modelConfig['standard'] || null;
      } else {
        result = modelConfig[tier];
      }
    }

    // Cache the result
    this.modelPricingCache.set(cacheKey, result);
    return result;
  }

  public calculateCost(
    model: string, 
    promptTokens: number, 
    completionTokens: number, 
    tier: ProcessingTier = DEFAULT_TIER,
    useCachedInput: boolean = false
  ): CostCalculation {
    const pricing = this.getModelPricing(model, tier);
    
    if (!pricing) {
      if (process.env.NODE_ENV !== 'test') {
        console.error(`🔴 [PricingService] Cannot calculate cost for unknown model: ${model}`);
      }
      return {
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        model,
        tier,
        promptTokens,
        completionTokens
      };
    }

    // Use cached input pricing if available and requested
    const inputRate = useCachedInput && pricing.cached_input 
      ? pricing.cached_input 
      : pricing.input;

    // Calculate costs (pricing is per 1M tokens)
    const inputCost = (promptTokens * inputRate) / 1_000_000;
    const outputCost = (completionTokens * pricing.output) / 1_000_000;
    const totalCost = inputCost + outputCost;

    return {
      inputCost: Number(inputCost.toFixed(6)),
      outputCost: Number(outputCost.toFixed(6)),
      totalCost: Number(totalCost.toFixed(6)),
      model,
      tier,
      promptTokens,
      completionTokens
    };
  }

  public estimateCost(
    model: string, 
    estimatedPromptTokens: number, 
    estimatedCompletionTokens: number,
    tier: ProcessingTier = DEFAULT_TIER
  ): CostCalculation {
    return this.calculateCost(model, estimatedPromptTokens, estimatedCompletionTokens, tier);
  }

  public getModelList(): string[] {
    return Object.keys(this.pricingConfig);
  }

  public getAvailableTiers(model: string): ProcessingTier[] {
    if (!isValidModel(model)) return [];
    return Object.keys(this.pricingConfig[model]) as ProcessingTier[];
  }

  public formatCost(cost: number): string {
    if (cost >= 1) {
      return `$${cost.toFixed(2)}`;
    } else if (cost >= 0.001) {
      return `$${cost.toFixed(4)}`;
    } else {
      return `$${cost.toFixed(6)}`;
    }
  }

  public validateModel(model: string): { valid: boolean; message?: string } {
    if (!isValidModel(model)) {
      return { 
        valid: false, 
        message: `Model "${model}" is not supported. Available models: ${this.getModelList().slice(0, 5).join(', ')}...` 
      };
    }
    return { valid: true };
  }

  public validateTier(tier: string): { valid: boolean; message?: string } {
    if (!isValidTier(tier)) {
      return { 
        valid: false, 
        message: `Tier "${tier}" is not supported. Available tiers: standard, batch, flex, priority` 
      };
    }
    return { valid: true };
  }

  public getCostSummary(calculations: CostCalculation[]): {
    totalCost: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    callCount: number;
    averageCostPerCall: number;
    averageTokensPerCall: number;
  } {
    const summary = calculations.reduce(
      (acc, calc) => ({
        totalCost: acc.totalCost + calc.totalCost,
        totalPromptTokens: acc.totalPromptTokens + calc.promptTokens,
        totalCompletionTokens: acc.totalCompletionTokens + calc.completionTokens,
        callCount: acc.callCount + 1
      }),
      { totalCost: 0, totalPromptTokens: 0, totalCompletionTokens: 0, callCount: 0 }
    );

    const totalTokens = summary.totalPromptTokens + summary.totalCompletionTokens;
    
    return {
      ...summary,
      totalTokens,
      averageCostPerCall: summary.callCount > 0 ? summary.totalCost / summary.callCount : 0,
      averageTokensPerCall: summary.callCount > 0 ? totalTokens / summary.callCount : 0
    };
  }
}

export const pricingService = new PricingService();