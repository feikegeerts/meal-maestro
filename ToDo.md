# Post-MVP Development Roadmap

1. [ ] Record videos for the homepage

## Quality & Compliance

1. [ ] Write more tests
1. [ ] Add Jest suite for src/lib/date-utils.ts covering getDateLocaleFormat, formatDate, and formatDateWithFallback.
1. [ ] Add Jest suite for src/lib/utils.ts covering processInstructions, splitIntoSteps, and toDateOnlyISOString.
1. [ ] Expand src/lib/**tests**/recipe-utils.test.ts (or create it) to cover type guards and validateRecipeInput error paths.
1. [ ] Add tests for getAllowedUnits, createRecipeFormFunction, and custom-unit handling in src/lib/recipe-functions.ts.
1. [ ] Unit-test FunctionCallProcessor.processFunctionCall flows in src/lib/function-call-processor.ts with mocked OpenAI/Supabase interactions.
1. [ ] Add coverage for prompt assembly in src/lib/conversation-builder.ts (unit preference, custom units, context messages).
1. [ ] Add tests around spend/rate-limit alert logic in src/lib/usage-limit-service.ts with mocked Supabase RPCs and EmailDeliveryService.

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
