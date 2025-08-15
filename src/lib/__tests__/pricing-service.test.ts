import { pricingService } from '../pricing-service';

describe('PricingService', () => {
  describe('getModelPricing', () => {
    it('should return pricing for valid model and tier', () => {
      const pricing = pricingService.getModelPricing('gpt-4o-mini', 'standard');
      expect(pricing).toEqual({
        input: 0.15,
        cached_input: 0.075,
        output: 0.60
      });
    });

    it('should return null for invalid model', () => {
      const pricing = pricingService.getModelPricing('invalid-model');
      expect(pricing).toBeNull();
    });

    it('should fallback to standard tier if tier not available', () => {
      const pricing = pricingService.getModelPricing('gpt-4o-mini', 'priority');
      expect(pricing).toEqual({
        input: 0.15,
        cached_input: 0.075,
        output: 0.60
      });
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly for gpt-4o-mini', () => {
      const result = pricingService.calculateCost('gpt-4o-mini', 1000, 500, 'standard');
      
      expect(result.model).toBe('gpt-4o-mini');
      expect(result.tier).toBe('standard');
      expect(result.promptTokens).toBe(1000);
      expect(result.completionTokens).toBe(500);
      
      // Expected: (1000 * 0.15 + 500 * 0.60) / 1,000,000 = (150 + 300) / 1,000,000 = 0.00045
      expect(result.inputCost).toBe(0.00015);
      expect(result.outputCost).toBe(0.0003);
      expect(result.totalCost).toBe(0.00045);
    });

    it('should handle cached input pricing', () => {
      const result = pricingService.calculateCost('gpt-4o-mini', 1000, 500, 'standard', true);
      
      // Expected with cached: (1000 * 0.075 + 500 * 0.60) / 1,000,000 = (75 + 300) / 1,000,000 = 0.000375
      expect(result.inputCost).toBe(0.000075);
      expect(result.outputCost).toBe(0.0003);
      expect(result.totalCost).toBe(0.000375);
    });

    it('should return zero cost for invalid model', () => {
      const result = pricingService.calculateCost('invalid-model', 1000, 500);
      
      expect(result.totalCost).toBe(0);
      expect(result.inputCost).toBe(0);
      expect(result.outputCost).toBe(0);
    });
  });

  describe('formatCost', () => {
    it('should format costs correctly', () => {
      expect(pricingService.formatCost(1.5)).toBe('$1.50');
      expect(pricingService.formatCost(0.1234)).toBe('$0.1234');
      expect(pricingService.formatCost(0.000123)).toBe('$0.000123');
    });
  });

  describe('validateModel', () => {
    it('should validate known models', () => {
      const result = pricingService.validateModel('gpt-4o-mini');
      expect(result.valid).toBe(true);
    });

    it('should reject unknown models', () => {
      const result = pricingService.validateModel('unknown-model');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('not supported');
    });
  });

  describe('getCostSummary', () => {
    it('should calculate summary correctly', () => {
      const calculations = [
        pricingService.calculateCost('gpt-4o-mini', 1000, 500),
        pricingService.calculateCost('gpt-4o-mini', 2000, 1000)
      ];

      const summary = pricingService.getCostSummary(calculations);

      expect(summary.callCount).toBe(2);
      expect(summary.totalPromptTokens).toBe(3000);
      expect(summary.totalCompletionTokens).toBe(1500);
      expect(summary.totalTokens).toBe(4500);
      expect(summary.totalCost).toBe(0.00135); // 0.00045 + 0.0009
      expect(summary.averageTokensPerCall).toBe(2250);
      expect(summary.averageCostPerCall).toBe(0.000675);
    });
  });
});