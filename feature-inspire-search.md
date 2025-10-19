# Inspire Search Enhancements

## Overview
The Inspire assistant currently recommends recipes from a pre-ranked shortlist but cannot actively search the user’s collection when asked for specific dishes, tags, or dietary preferences. The `/api/recipes` endpoint only does shallow `ilike` matching on title/description, so keywords like “glutenfree” or “spaghetti” fail unless they appear verbatim. We need a unified, full-text search surface that both the UI and AI can query to locate recipes by title, description, ingredient names, and structured tags (category, cuisine, diet types, proteins, occasions, characteristics, etc.).

## Goals
- Provide accurate keyword and tag-based discovery across the user’s recipe library.
- Expose a dedicated search tool to the Inspire assistant so it can fulfill “find” requests.
- Keep search fast and scalable for growing recipe collections.
- Maintain consistency between the web UI filters and Inspire’s AI-driven suggestions.

## Out of Scope
- UI redesign of the recipes table or Inspire chat interface.
- Federated search across shared/public recipes.
- Re-ranking or recommendation logic beyond enabling targeted search.

## Implementation Outline
1. **Search Document & Indexing**
   - Create a Supabase migration that assembles a `tsvector` search document combining title, description, normalized ingredient names/notes, and flattened tag arrays.
   - Normalize hyphenated tokens (e.g., “gluten-free”) and handle locale-specific diacritics.
   - Add a GIN index for performant `websearch_to_tsquery` lookups.
2. **API Enhancements**
   - Extend `/api/recipes` (or add `/api/recipes/search`) with full-text search support.
   - Support optional `tags`/`labels` filters that match against array columns using `overlaps`.
   - Return lightweight summary payloads when invoked in search mode to minimize bandwidth.
3. **Client & Service Updates**
   - Expand `recipeService.searchRecipes` to pass new query parameters and use the enhanced API.
   - Update the recipes list view to fall back to server-side search for large datasets while retaining client-side filtering for small lists.
4. **Inspire Assistant Integration**
   - Define a new `search_recipes` tool in `src/lib/advice-functions.ts`.
   - Update `AdviceChatService` prompts so the assistant knows when to call the search tool and how to combine its results with seasonal/recency-ranked candidates.
   - Ensure search results stay within the user’s collection and respect existing spend limits.
5. **Testing & Telemetry**
   - Add API integration tests covering keyword, tag, and mixed searches (including hyphenated or multi-word phrases).
   - Add unit tests for the advice flow to confirm the model triggers the search tool when appropriate.
   - Log search usage for future tuning (query patterns, hit rates, latency).

## Open Questions
- Should we surface spelling-correction or fuzzy matching, or rely on strict tokens initially?
- Do we need to surface relevance scores back to the UI/AI, or keep results unordered for now?
- Will we cap result counts for Inspire to avoid overwhelming the model?

## Dependencies & Risks
- Requires a database migration; we must coordinate deployment order.
- Full-text indexing might impact Supabase quotas—monitor index size and query cost.
- AI prompt changes need regression testing to ensure existing recommendation behavior remains intact.

## Validation Checklist
- Manual: run Inspire chat, ask for a tagged recipe (“find me gluten-free desserts”) and confirm results.
- API: `pnpm test -- search-api` (new suite) + existing unit tests.
- Lint/typecheck: `pnpm lint`, `pnpm exec tsc --noEmit`.

## Future Enhancements
- Consider cached search suggestions for frequently used keywords.
- Explore incorporating nutritional filters once data coverage improves.
- Unify search analytics with usage limits to spot heavy consumers.
