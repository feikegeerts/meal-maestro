import { RecipeValidator } from "../recipe-validator";
import { RecipeIngredient, RecipeSection } from "@/types/recipe";
import {
  MAX_NOTES_LENGTH,
  MAX_PAIRING_WINE_LENGTH,
  MAX_REFERENCE_LENGTH,
} from "../recipe-utils";

// ---------------------------------------------------------------------------
// hasKey
// ---------------------------------------------------------------------------
describe("RecipeValidator.hasKey", () => {
  it("returns true for own property", () => {
    expect(RecipeValidator.hasKey({ a: 1 }, "a")).toBe(true);
  });

  it("returns false for missing key", () => {
    expect(RecipeValidator.hasKey({ a: 1 }, "b")).toBe(false);
  });

  it("returns true for key with undefined value", () => {
    expect(RecipeValidator.hasKey({ a: undefined }, "a")).toBe(true);
  });

  it("returns false for inherited property", () => {
    const obj = Object.create({ inherited: true });
    expect(RecipeValidator.hasKey(obj as Record<string, unknown>, "inherited")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeTimeField
// ---------------------------------------------------------------------------
describe("RecipeValidator.normalizeTimeField", () => {
  it("returns undefined when value is undefined", () => {
    const errors: string[] = [];
    expect(RecipeValidator.normalizeTimeField(undefined, "Prep time", errors)).toBeUndefined();
    expect(errors).toHaveLength(0);
  });

  it("returns null when value is null", () => {
    const errors: string[] = [];
    expect(RecipeValidator.normalizeTimeField(null, "Prep time", errors)).toBeNull();
    expect(errors).toHaveLength(0);
  });

  it("returns the numeric value for valid integers", () => {
    const errors: string[] = [];
    expect(RecipeValidator.normalizeTimeField(30, "Cook time", errors)).toBe(30);
    expect(errors).toHaveLength(0);
  });

  it("coerces string numbers", () => {
    const errors: string[] = [];
    expect(RecipeValidator.normalizeTimeField("45", "Total time", errors)).toBe(45);
    expect(errors).toHaveLength(0);
  });

  it("pushes error and returns undefined for non-finite values", () => {
    const errors: string[] = [];
    expect(RecipeValidator.normalizeTimeField("abc", "Prep time", errors)).toBeUndefined();
    expect(errors).toContain("Prep time must be a number of minutes when provided");
  });

  it("pushes error and returns undefined for non-integer values", () => {
    const errors: string[] = [];
    expect(RecipeValidator.normalizeTimeField(12.5, "Cook time", errors)).toBeUndefined();
    expect(errors).toContain("Cook time must be a whole number of minutes");
  });

  it("pushes error and returns undefined for negative values", () => {
    const errors: string[] = [];
    expect(RecipeValidator.normalizeTimeField(-5, "Prep time", errors)).toBeUndefined();
    expect(errors).toContain("Prep time cannot be negative");
  });

  it("accepts 0 as valid", () => {
    const errors: string[] = [];
    expect(RecipeValidator.normalizeTimeField(0, "Prep time", errors)).toBe(0);
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// normalizeTimes
// ---------------------------------------------------------------------------
describe("RecipeValidator.normalizeTimes", () => {
  it("auto-calculates totalTime when not provided but prep and cook are", () => {
    const errors: string[] = [];
    const body = { prep_time: 10, cook_time: 20 };
    const result = RecipeValidator.normalizeTimes(body, errors);
    expect(result.totalTime).toBe(30);
    expect(errors).toHaveLength(0);
  });

  it("respects explicitly provided total_time over auto-calculation", () => {
    const errors: string[] = [];
    const body = { prep_time: 10, cook_time: 20, total_time: 99 };
    const result = RecipeValidator.normalizeTimes(body, errors);
    expect(result.totalTime).toBe(99);
  });

  it("reports prepProvided / cookProvided / totalProvided correctly", () => {
    const errors: string[] = [];
    const body = { prep_time: 15, total_time: 15 };
    const result = RecipeValidator.normalizeTimes(body, errors);
    expect(result.prepProvided).toBe(true);
    expect(result.cookProvided).toBe(false);
    expect(result.totalProvided).toBe(true);
  });

  it("collects time field errors", () => {
    const errors: string[] = [];
    const body = { prep_time: -1 };
    RecipeValidator.normalizeTimes(body, errors);
    expect(errors).toContain("Prep time cannot be negative");
  });
});

// ---------------------------------------------------------------------------
// normalizeIngredient
// ---------------------------------------------------------------------------
describe("RecipeValidator.normalizeIngredient", () => {
  const base: RecipeIngredient = { id: "1", name: "Garlic", amount: 2, unit: "teen" };

  it("converts Dutch 'teen' to 'clove'", () => {
    expect(RecipeValidator.normalizeIngredient(base).unit).toBe("clove");
  });

  it("converts 'el'/'eetlepel' to 'tbsp'", () => {
    const el = { ...base, unit: "el" };
    const eetlepel = { ...base, unit: "eetlepel" };
    expect(RecipeValidator.normalizeIngredient(el).unit).toBe("tbsp");
    expect(RecipeValidator.normalizeIngredient(eetlepel).unit).toBe("tbsp");
  });

  it("converts 'tl'/'theelepel' to 'tsp'", () => {
    const tl = { ...base, unit: "tl" };
    expect(RecipeValidator.normalizeIngredient(tl).unit).toBe("tsp");
  });

  it("removes unit for 'stuk'/'stuks'/'pieces'", () => {
    const stuk = { ...base, unit: "stuk" };
    expect(RecipeValidator.normalizeIngredient(stuk).unit).toBeNull();
  });

  it("keeps valid standard units", () => {
    const grams = { ...base, unit: "g" };
    expect(RecipeValidator.normalizeIngredient(grams).unit).toBe("g");
  });

  it("nullifies unknown units", () => {
    const weird = { ...base, unit: "handful" };
    expect(RecipeValidator.normalizeIngredient(weird).unit).toBeNull();
  });

  it("keeps 'naar smaak' and 'to taste'", () => {
    const naarSmaak = { ...base, unit: "naar smaak" };
    const toTaste = { ...base, unit: "to taste" };
    expect(RecipeValidator.normalizeIngredient(naarSmaak).unit).toBe("naar smaak");
    expect(RecipeValidator.normalizeIngredient(toTaste).unit).toBe("to taste");
  });

  it("converts amount 0 to null", () => {
    const zero = { ...base, amount: 0 };
    expect(RecipeValidator.normalizeIngredient(zero).amount).toBeNull();
  });

  it("converts undefined amount to null", () => {
    const undef = { ...base, amount: undefined as unknown as null };
    expect(RecipeValidator.normalizeIngredient(undef).amount).toBeNull();
  });

  it("preserves non-zero amount", () => {
    expect(RecipeValidator.normalizeIngredient(base).amount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// validateIngredients
// ---------------------------------------------------------------------------
describe("RecipeValidator.validateIngredients", () => {
  const valid: RecipeIngredient[] = [
    { id: "1", name: "Onion", amount: 1, unit: "g" },
  ];

  it("returns null for valid ingredients", () => {
    expect(RecipeValidator.validateIngredients(valid)).toBeNull();
  });

  it("returns error when ingredient is missing id or name", () => {
    const bad: RecipeIngredient[] = [{ id: "", name: "Onion", amount: 1, unit: null }];
    expect(RecipeValidator.validateIngredients(bad)).toBe("Each ingredient must have an id and name");
  });

  it("returns error when amount is invalid (zero-coerced is fine, negative is not)", () => {
    const bad: RecipeIngredient[] = [{ id: "1", name: "Onion", amount: -1, unit: null }];
    expect(RecipeValidator.validateIngredients(bad)).toBe(
      "Ingredient amounts must be positive numbers or null",
    );
  });

  it("returns null when amount is null", () => {
    const nullAmount: RecipeIngredient[] = [{ id: "1", name: "Salt", amount: null, unit: null }];
    expect(RecipeValidator.validateIngredients(nullAmount)).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(RecipeValidator.validateIngredients([])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateAndNormalizeSections
// ---------------------------------------------------------------------------
describe("RecipeValidator.validateAndNormalizeSections", () => {
  const validSection: RecipeSection = {
    id: "s1",
    title: "  Main  ",
    instructions: "Cook it",
    ingredients: [{ id: "i1", name: "Tomato", amount: 2, unit: "g" }],
  };

  it("normalizes and returns sections without errors", () => {
    const errors: string[] = [];
    const result = RecipeValidator.validateAndNormalizeSections([validSection], errors);
    expect(errors).toHaveLength(0);
    expect(result[0].title).toBe("Main");
  });

  it("pushes error when section id is missing", () => {
    const errors: string[] = [];
    const section = { ...validSection, id: "" };
    RecipeValidator.validateAndNormalizeSections([section], errors);
    expect(errors).toContain("Section 1 is missing an id");
  });

  it("pushes error when section title is blank", () => {
    const errors: string[] = [];
    const section = { ...validSection, title: "  " };
    RecipeValidator.validateAndNormalizeSections([section], errors);
    expect(errors).toContain("Section 1 title is required");
  });

  it("pushes error when instructions are missing", () => {
    const errors: string[] = [];
    const section = { ...validSection, instructions: "" };
    RecipeValidator.validateAndNormalizeSections([section], errors);
    expect(errors).toContain("Section 1 instructions are required");
  });

  it("pushes error when ingredients array is empty", () => {
    const errors: string[] = [];
    const section = { ...validSection, ingredients: [] };
    RecipeValidator.validateAndNormalizeSections([section], errors);
    expect(errors).toContain("Section 1 must include at least one ingredient");
  });

  it("pushes error for invalid ingredient inside section", () => {
    const errors: string[] = [];
    const section = {
      ...validSection,
      ingredients: [{ id: "", name: "", amount: null, unit: null }],
    };
    RecipeValidator.validateAndNormalizeSections([section], errors);
    expect(errors).toContain("Section 1 ingredient 1 must have an id and name");
  });

  it("normalizes ingredients inside sections", () => {
    const errors: string[] = [];
    const section = {
      ...validSection,
      ingredients: [{ id: "i1", name: "Garlic", amount: 2, unit: "teen" }],
    };
    const result = RecipeValidator.validateAndNormalizeSections([section], errors);
    expect(result[0].ingredients[0].unit).toBe("clove");
  });
});

// ---------------------------------------------------------------------------
// normalizeReference
// ---------------------------------------------------------------------------
describe("RecipeValidator.normalizeReference", () => {
  it("trims whitespace and returns string", () => {
    const errors: string[] = [];
    expect(RecipeValidator.normalizeReference("  url  ", errors)).toBe("url");
    expect(errors).toHaveLength(0);
  });

  it("returns null for non-string values", () => {
    const errors: string[] = [];
    expect(RecipeValidator.normalizeReference(null, errors)).toBeNull();
    expect(RecipeValidator.normalizeReference(undefined, errors)).toBeNull();
    expect(errors).toHaveLength(0);
  });

  it("pushes error when reference exceeds max length", () => {
    const errors: string[] = [];
    RecipeValidator.normalizeReference("a".repeat(MAX_REFERENCE_LENGTH + 1), errors);
    expect(errors).toContain(
      `Reference must be ${MAX_REFERENCE_LENGTH} characters or fewer`,
    );
  });
});

// ---------------------------------------------------------------------------
// normalizePairingWine
// ---------------------------------------------------------------------------
describe("RecipeValidator.normalizePairingWine", () => {
  it("trims and returns the wine string", () => {
    const errors: string[] = [];
    expect(RecipeValidator.normalizePairingWine("  Merlot  ", errors)).toBe("Merlot");
    expect(errors).toHaveLength(0);
  });

  it("returns null for non-string values", () => {
    const errors: string[] = [];
    expect(RecipeValidator.normalizePairingWine(null, errors)).toBeNull();
  });

  it("pushes error when pairing wine exceeds max length", () => {
    const errors: string[] = [];
    RecipeValidator.normalizePairingWine("a".repeat(MAX_PAIRING_WINE_LENGTH + 1), errors);
    expect(errors).toContain(
      `Wine pairing must be ${MAX_PAIRING_WINE_LENGTH} characters or fewer`,
    );
  });
});

// ---------------------------------------------------------------------------
// normalizeNotes
// ---------------------------------------------------------------------------
describe("RecipeValidator.normalizeNotes", () => {
  it("returns the notes string as-is", () => {
    const errors: string[] = [];
    expect(RecipeValidator.normalizeNotes("some notes", errors)).toBe("some notes");
    expect(errors).toHaveLength(0);
  });

  it("returns null for non-string values", () => {
    const errors: string[] = [];
    expect(RecipeValidator.normalizeNotes(null, errors)).toBeNull();
    expect(RecipeValidator.normalizeNotes(42, errors)).toBeNull();
  });

  it("pushes error when notes exceed max length", () => {
    const errors: string[] = [];
    RecipeValidator.normalizeNotes("a".repeat(MAX_NOTES_LENGTH + 1), errors);
    expect(errors).toContain(
      `Notes must be ${MAX_NOTES_LENGTH} characters or fewer`,
    );
  });
});
