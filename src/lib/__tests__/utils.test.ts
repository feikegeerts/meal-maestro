import {
  processInstructions,
  splitIntoSteps,
  toDateOnlyISOString,
} from '../utils';

describe('utils', () => {
  describe('toDateOnlyISOString', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns current date at time of call when no date provided', () => {
      const fixedDate = new Date('2024-05-20T08:15:00.000Z');
      jest.useFakeTimers().setSystemTime(fixedDate);

      const resultIso = toDateOnlyISOString();
      expect(resultIso).toBe(fixedDate.toISOString());
    });

    it('normalises provided date to noon local time', () => {
      const input = new Date(2024, 3, 10, 3, 45, 0);
      const iso = toDateOnlyISOString(input);
      const asDate = new Date(iso);

      expect(asDate.getFullYear()).toBe(input.getFullYear());
      expect(asDate.getMonth()).toBe(input.getMonth());
      expect(asDate.getDate()).toBe(input.getDate());
      expect(asDate.getHours()).toBe(12);
      expect(asDate.getMinutes()).toBe(0);
    });
  });

  describe('processInstructions', () => {
    it('handles empty or whitespace-only descriptions', () => {
      const result = processInstructions('   ');
      expect(result).toEqual({
        isStepFormat: false,
        steps: [],
        originalText: '   ',
      });
    });

    it('parses numbered steps and keeps descriptive text separate', () => {
      const input = `1. Preheat oven\nThis is a note\n2. Mix ingredients thoroughly`;
      const result = processInstructions(input);

      expect(result.isStepFormat).toBe(true);
      expect(result.steps).toEqual(['Preheat oven', 'Mix ingredients thoroughly']);
      expect(result.descriptiveText).toEqual(['This is a note']);
    });

    it('treats multi-line descriptions as step format', () => {
      const input = 'Chop vegetables\nSaute in pan\nServe immediately';
      const result = processInstructions(input);

      expect(result.isStepFormat).toBe(true);
      expect(result.steps).toEqual([
        'Chop vegetables',
        'Saute in pan',
        'Serve immediately',
      ]);
    });

    it('splits single paragraph instructions into steps when possible', () => {
      const input = 'Heat the oven. Combine the dry ingredients. Bake until golden brown.';
      const result = processInstructions(input);

      expect(result.isStepFormat).toBe(true);
      expect(result.steps).toEqual([
        'Heat the oven.',
        'Combine the dry ingredients.',
        'Bake until golden brown.',
      ]);
    });

    it('falls back to single step when unable to split meaningfully', () => {
      const input = 'Mix.';
      const result = processInstructions(input);

      expect(result.isStepFormat).toBe(false);
      expect(result.steps).toEqual(['Mix.']);
    });
  });

  describe('splitIntoSteps', () => {
    it('splits by punctuation followed by capital letters', () => {
      const input =
        'Heat the oven thoroughly. Add batter to the prepared pan. Bake until the cake is golden brown.';
      expect(splitIntoSteps(input)).toEqual([
        'Heat the oven thoroughly.',
        'Add batter to the prepared pan.',
        'Bake until the cake is golden brown.',
      ]);
    });

    it('filters out fragments shorter than threshold', () => {
      const input = 'Heat the oven thoroughly. Stir. Bake until golden brown.';
      expect(splitIntoSteps(input)).toEqual([
        'Heat the oven thoroughly.',
        'Bake until golden brown.',
      ]);
    });

    it('falls back to returning original text when no separators found', () => {
      const input = 'Single instruction only';
      expect(splitIntoSteps(input)).toEqual(['Single instruction only']);
    });
  });
});
