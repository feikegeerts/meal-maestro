import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { RecipeEditForm } from "@/components/recipe-edit-form";
import {
  RecipeCategory,
  RecipeSeason,
  type Recipe,
  type RecipeInput,
} from "@/types/recipe";

vi.mock("@/components/recipe-edit/hooks/use-auto-save", () => ({
  useAutoSave: vi.fn(),
}));

vi.mock("@/components/recipe-edit/components/basic-information-section", () => ({
  BasicInformationSection: ({
    formData,
    onFormDataChange,
  }: {
    formData: RecipeInput;
    onFormDataChange: (updates: Partial<RecipeInput>) => void;
  }) => (
    <input
      data-testid="title-input"
      value={formData.title}
      onChange={(e) => onFormDataChange({ title: (e.target as HTMLInputElement).value })}
    />
  ),
}));

vi.mock("@/components/recipe-edit/components/ingredients-section", () => ({
  IngredientsSection: ({ loading }: { loading?: boolean }) => (
    <div>{loading ? "ingredients-loading" : "IngredientsSection"}</div>
  ),
}));

vi.mock("@/components/recipe-edit/components/instructions-section", () => ({
  InstructionsSection: ({
    onDescriptionChange,
  }: {
    onDescriptionChange: (description: string) => void;
  }) => (
    <button onClick={() => onDescriptionChange("new instructions")}>
      InstructionsSection
    </button>
  ),
}));

vi.mock("@/components/recipe-edit/components/sections-section", () => ({
  SectionsSection: ({ onAddSection }: { onAddSection: () => void }) => (
    <div>
      SectionsSection
      <button onClick={onAddSection}>add-section</button>
    </div>
  ),
}));

vi.mock("@/components/recipe-edit/components/categorized-tag-selector", () => ({
  CategorizedTagSelector: () => <div>Tags</div>,
}));

vi.mock("@/components/recipe-edit/components/nutrition-section", () => ({
  NutritionSection: () => <div>Nutrition</div>,
}));

vi.mock("@/components/recipe-edit/components/form-layout-renderer", () => ({
  FormLayoutRenderer: ({
    children,
  }: {
    children: ReactNode;
  }) => <div>{children}</div>,
}));

const baseRecipe: Recipe = {
  id: "recipe-1",
  user_id: "user-1",
  title: "Test Recipe",
  ingredients: [{ id: "ing-1", name: "Salt", amount: 1, unit: "tsp" }],
  sections: [],
  servings: 2,
  description: "A test recipe",
  category: RecipeCategory.MAIN_COURSE,
  season: RecipeSeason.YEAR_ROUND,
  cuisine: undefined,
  diet_types: [],
  cooking_methods: [],
  dish_types: [],
  proteins: [],
  occasions: [],
  characteristics: [],
  image_url: null,
  image_metadata: null,
  last_eaten: undefined,
  nutrition: null,
};

describe("RecipeEditForm", () => {
  it("shows validation errors when required fields are empty", async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    render(
      <RecipeEditForm
        recipe={{ ...baseRecipe, title: "" }}
        onSave={handleSave}
        standalone
      />
    );

    fireEvent.change(screen.getByTestId("title-input"), {
      target: { value: "" },
    });

    fireEvent.click(screen.getByText("saveChanges"));

    expect(handleSave).not.toHaveBeenCalled();
    expect(await screen.findByText(/titleMissing/)).toBeInTheDocument();
  });

  it("toggles between ingredients and sections modes", () => {
    render(
      <RecipeEditForm recipe={baseRecipe} onSave={vi.fn()} standalone />
    );

    expect(screen.getByText("IngredientsSection")).toBeInTheDocument();
    const toggle = screen.getByRole("checkbox");
    fireEvent.click(toggle);
    expect(screen.queryByText("IngredientsSection")).not.toBeInTheDocument();
    expect(screen.getByText("SectionsSection")).toBeInTheDocument();
  });
});
