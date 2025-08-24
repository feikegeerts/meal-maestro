"use client";

import { ReactNode } from "react";
import { Recipe, RecipeInput } from "@/types/recipe";
import { ChatInterface } from "@/components/chat/chat-interface";
import { GRID_CONFIG, SPACING_CONFIG } from "../config/form-constants";

interface FormLayoutRendererProps {
  layoutMode: "single-column" | "two-column";
  includeChat: boolean;
  recipe: Recipe;
  memoizedFormState: RecipeInput;
  onAIRecipeUpdate: (aiRecipeData: unknown) => void;
  children: ReactNode;
}

export function FormLayoutRenderer({
  layoutMode,
  includeChat,
  recipe,
  memoizedFormState,
  onAIRecipeUpdate,
  children,
}: FormLayoutRendererProps) {
  if (layoutMode === "single-column") {
    return (
      <div className={SPACING_CONFIG.CARD_SPACING}>
        {includeChat && (
          <div className="mb-6">
            <ChatInterface
              selectedRecipe={recipe}
              onRecipeGenerated={onAIRecipeUpdate}
              currentFormState={memoizedFormState}
            />
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className={`${SPACING_CONFIG.CARD_SPACING} ${SPACING_CONFIG.DESKTOP_SPACING} ${GRID_CONFIG.DESKTOP_LAYOUT}`}>
      {includeChat && (
        <div className={GRID_CONFIG.CHAT_COLUMNS}>
          <div className="lg:sticky lg:top-6 lg:self-start">
            <ChatInterface
              selectedRecipe={recipe}
              onRecipeGenerated={onAIRecipeUpdate}
              currentFormState={memoizedFormState}
              isDesktopSidebar={true}
            />
          </div>
        </div>
      )}

      <div
        className={`${SPACING_CONFIG.CARD_SPACING} lg:!mt-0 ${
          includeChat ? GRID_CONFIG.FORM_COLUMNS : GRID_CONFIG.FORM_FULL_COLUMNS
        }`}
      >
        {children}
      </div>
    </div>
  );
}