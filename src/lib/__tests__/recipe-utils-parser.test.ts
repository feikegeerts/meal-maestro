import { parseIngredientString } from '../recipe-utils';

describe('parseIngredientString', () => {
  it('parses amount + unit + name separated by spaces', () => {
    expect(parseIngredientString('500 g flour')).toEqual({
      amount: 500,
      unit: 'g',
      name: 'flour',
    });
  });

  it('parses amount glued to unit (no space)', () => {
    expect(parseIngredientString('500g flour')).toEqual({
      amount: 500,
      unit: 'g',
      name: 'flour',
    });
  });

  it('parses a multi-word unit (fl oz)', () => {
    expect(parseIngredientString('8 fl oz cream')).toEqual({
      amount: 8,
      unit: 'fl oz',
      name: 'cream',
    });
  });

  it('parses amount with no unit', () => {
    expect(parseIngredientString('2 onions')).toEqual({
      amount: 2,
      unit: null,
      name: 'onions',
    });
  });

  it('parses a decimal amount', () => {
    expect(parseIngredientString('1.5 tbsp olive oil')).toEqual({
      amount: 1.5,
      unit: 'tbsp',
      name: 'olive oil',
    });
  });

  it('parses a fraction amount', () => {
    expect(parseIngredientString('1/2 cup sugar')).toEqual({
      amount: 0.5,
      unit: 'cup',
      name: 'sugar',
    });
  });

  it('returns name only when no amount is present', () => {
    expect(parseIngredientString('salt')).toEqual({
      amount: null,
      unit: null,
      name: 'salt',
    });
  });

  it('returns name only for a multi-word ingredient with no amount', () => {
    expect(parseIngredientString('olive oil')).toEqual({
      amount: null,
      unit: null,
      name: 'olive oil',
    });
  });

  it('handles leading and trailing whitespace', () => {
    expect(parseIngredientString('  300 ml milk  ')).toEqual({
      amount: 300,
      unit: 'ml',
      name: 'milk',
    });
  });

  it('returns empty name for empty string input', () => {
    expect(parseIngredientString('')).toEqual({
      amount: null,
      unit: null,
      name: '',
    });
  });

  it('parses tbsp correctly', () => {
    expect(parseIngredientString('2 tbsp soy sauce')).toEqual({
      amount: 2,
      unit: 'tbsp',
      name: 'soy sauce',
    });
  });

  it('parses clove unit', () => {
    expect(parseIngredientString('3 cloves garlic')).toEqual({
      amount: 3,
      unit: 'cloves',
      name: 'garlic',
    });
  });

  it('parses slice/slices unit', () => {
    expect(parseIngredientString('2 slices bread')).toEqual({
      amount: 2,
      unit: 'slices',
      name: 'bread',
    });
  });

  it('parses can unit', () => {
    expect(parseIngredientString('1 can tomatoes')).toEqual({
      amount: 1,
      unit: 'can',
      name: 'tomatoes',
    });
  });

  it('handles integer with unit glued, multi-word name', () => {
    expect(parseIngredientString('200g self raising flour')).toEqual({
      amount: 200,
      unit: 'g',
      name: 'self raising flour',
    });
  });
});
