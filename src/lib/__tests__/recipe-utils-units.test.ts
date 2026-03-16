import { areUnitsCompatible, mergeAmounts } from '../recipe-utils';

describe('areUnitsCompatible', () => {
  it('returns true for two identical units', () => {
    expect(areUnitsCompatible('g', 'g')).toBe(true);
    expect(areUnitsCompatible('cup', 'cup')).toBe(true);
    expect(areUnitsCompatible('oz', 'oz')).toBe(true);
  });

  it('returns true when both are null', () => {
    expect(areUnitsCompatible(null, null)).toBe(true);
  });

  it('returns false when one is null and the other is not', () => {
    expect(areUnitsCompatible(null, 'g')).toBe(false);
    expect(areUnitsCompatible('g', null)).toBe(false);
  });

  it('returns true for units in the same weight-metric family (g, kg)', () => {
    expect(areUnitsCompatible('g', 'kg')).toBe(true);
    expect(areUnitsCompatible('kg', 'g')).toBe(true);
  });

  it('returns true for units in the same weight-imperial family (oz, lb)', () => {
    expect(areUnitsCompatible('oz', 'lb')).toBe(true);
    expect(areUnitsCompatible('lb', 'oz')).toBe(true);
  });

  it('returns true for units in the same volume-metric family (ml, l)', () => {
    expect(areUnitsCompatible('ml', 'l')).toBe(true);
    expect(areUnitsCompatible('l', 'ml')).toBe(true);
  });

  it('returns true for units in the same volume-imperial family (tsp, tbsp, cup, fl oz)', () => {
    expect(areUnitsCompatible('tsp', 'tbsp')).toBe(true);
    expect(areUnitsCompatible('tbsp', 'cup')).toBe(true);
    expect(areUnitsCompatible('cup', 'fl oz')).toBe(true);
    expect(areUnitsCompatible('fl oz', 'tsp')).toBe(true);
  });

  it('returns false for units in different families', () => {
    expect(areUnitsCompatible('g', 'ml')).toBe(false);
    expect(areUnitsCompatible('g', 'oz')).toBe(false);
    expect(areUnitsCompatible('tsp', 'ml')).toBe(false);
    expect(areUnitsCompatible('cup', 'l')).toBe(false);
    expect(areUnitsCompatible('kg', 'lb')).toBe(false);
  });

  it('returns false for a unit vs a count/misc unit', () => {
    expect(areUnitsCompatible('g', 'clove')).toBe(false);
    expect(areUnitsCompatible('clove', 'g')).toBe(false);
  });
});

describe('mergeAmounts', () => {
  it('sums two amounts with the same unit', () => {
    const result = mergeAmounts(200, 'g', 300, 'g');
    expect(result).toEqual({ amount: 500, unit: 'g' });
  });

  it('sums g and kg, converting to the smart unit', () => {
    // 200g + 1kg = 1200g → smart converts to 1.2kg
    const result = mergeAmounts(200, 'g', 1, 'kg');
    expect(result.unit).toBe('kg');
    expect(result.amount).toBeCloseTo(1.2);
  });

  it('sums ml and l, converting to the smart unit', () => {
    // 500ml + 0.75l = 500ml + 750ml = 1250ml → 1.25l
    const result = mergeAmounts(500, 'ml', 0.75, 'l');
    expect(result.unit).toBe('l');
    expect(result.amount).toBeCloseTo(1.25);
  });

  it('smart-converts 1500g to kg', () => {
    const result = mergeAmounts(1000, 'g', 500, 'g');
    expect(result).toEqual({ amount: 1.5, unit: 'kg' });
  });

  it('sums tsp and tbsp, expressing in tsp', () => {
    // 1 tbsp = 3 tsp → 2tsp + 1tbsp = 2 + 3 = 5 tsp
    const result = mergeAmounts(2, 'tsp', 1, 'tbsp');
    expect(result).toEqual({ amount: 5, unit: 'tsp' });
  });

  it('sums oz and lb, converting to the smart unit', () => {
    // 8oz + 1lb = 8 + 16 = 24oz → smart converts to 1.5lb
    const result = mergeAmounts(8, 'oz', 1, 'lb');
    expect(result.unit).toBe('lb');
    expect(result.amount).toBeCloseTo(1.5);
  });

  it('keeps small totals in base unit (stays in g when <1000)', () => {
    const result = mergeAmounts(100, 'g', 200, 'g');
    expect(result).toEqual({ amount: 300, unit: 'g' });
  });

  it('keeps small totals in tsp when < tbsp threshold', () => {
    const result = mergeAmounts(1, 'tsp', 1, 'tsp');
    expect(result).toEqual({ amount: 2, unit: 'tsp' });
  });

  it('sums two equal tbsp amounts', () => {
    const result = mergeAmounts(2, 'tbsp', 3, 'tbsp');
    // 2 tbsp = 6 tsp, 3 tbsp = 9 tsp, total 15 tsp = 5 tbsp
    expect(result).toEqual({ amount: 5, unit: 'tbsp' });
  });
});
