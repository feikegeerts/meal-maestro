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
  leftColumnSections?: ReactNode;
  rightColumnSections?: ReactNode;
  actionButtons?: ReactNode;
}

export function FormLayoutRenderer({
  layoutMode,
  includeChat,
  recipe,
  memoizedFormState,
  onAIRecipeUpdate,
  children,
  leftColumnSections,
  rightColumnSections,
  actionButtons,
}: FormLayoutRendererProps) {
  if (layoutMode === "single-column") {
    return (
      <div
        className={`${SPACING_CONFIG.CARD_SPACING} ${
          !includeChat && leftColumnSections && rightColumnSections
            ? ""
            : "max-w-6xl mx-auto"
        }`}
      >
        {includeChat && (
          <div className="mb-6">
            <ChatInterface
              selectedRecipe={recipe}
              onRecipeGenerated={onAIRecipeUpdate}
              currentFormState={memoizedFormState}
            />
          </div>
        )}
        {/* If no chat interface, create a two-column form layout */}
        {!includeChat && leftColumnSections && rightColumnSections ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">{leftColumnSections}</div>
            <div className="space-y-6">
              {rightColumnSections}
              {actionButtons && (
                <div className="lg:hidden">{actionButtons}</div>
              )}
            </div>
            {actionButtons && (
              <div className="hidden lg:block lg:col-span-2 lg:mt-6">
                {actionButtons}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
            <div className="lg:col-span-1 space-y-6">{children}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${SPACING_CONFIG.CARD_SPACING} ${SPACING_CONFIG.DESKTOP_SPACING} ${GRID_CONFIG.DESKTOP_LAYOUT}`}
    >
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
