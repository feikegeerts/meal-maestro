# Post-MVP Development Roadmap

## User Experience

## Analytics & Monetization

9. [ ] Metrics, what kind of metrics do we want, do we want to keep sending this to the admin dashbaord or think about something else?
10. [ ] Maximize the spend of a user in a given month, point them to the donate
11. [ ] Add bunq.me donation link for mobile-friendly bank transfers
12. [ ] Alerts on rate limit hits and openAI cost ??? Doesn't have to be in meal maestro

## Quality & Compliance

1. [ ] Refactor codebase
       12.1 [ ] - recipe-scraper.ts
1. [ ] Write more tests
1. [ ] Switch from handlebars to mustache.js so the build warnings go away

## V2.0 feature requests

1. [ ] Tiktok import
1. [ ] Extra columns
   1. [ ] Reference column to add the original link / place of the recipe
   1. [ ] Add calories
   1. [ ] nutritional values
   1. [ ] Bereidingstijd, totale tijd etc.
   1. [ ] Add free form notes to the recipes, to for example keep track of when somebody ate this with whom
   1. [ ] Add whine section
1. [ ] Add a tile view with the recipe photos next to the list view
1. [ ] Groccery shopping list
1. [ ] Menu creator functionality that combines multiple recipes
1. [ ] Recipe advice, add the chat functionality somewhere else and load all the recipes in context of that chat window to get advice on certain things
1. [ ] Patch notes, just use the the latest commit message and put it somewhere with a husky precommit hook. the site can then show the latest few version updates. Husky can automatically update when there is a new version an grab the latest commit messages that belong to that version

---

### Follow-up suggestions (recipe types refactor)

1. Replace re-export layer: update imports currently using `@/types/recipe` for functions (e.g. `validateRecipeInput`, `scaleRecipe`) to instead import from `@/lib/recipe-utils`.
2. After all imports updated, remove the re-export block from `types/recipe.ts`.
3. Consider a `src/domain/recipe/` folder grouping `types.ts`, `utils.ts`, `validation.ts` if the domain grows.
4. Introduce stricter branded types for IDs (e.g. `RecipeId` as opaque type) to avoid mix-ups.
5. Split large util file if it grows further: maybe `unit-conversion.ts`, `scaling.ts`, `validation.ts`.
6. Add unit tests specifically for `recipe-utils` (conversion edge cases, fraction formatting) if coverage gaps appear.
7. Consider runtime schema (zod) for `RecipeInput` to centralize validation and derive TS types.
