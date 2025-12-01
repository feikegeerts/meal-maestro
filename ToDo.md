# Post-MVP Development Roadmap

1. [ ] Record videos for the homepage

## Quality & Compliance

1. [ ] Add more integration tests (run via `pnpm verify` in CI; keep them fast and focused on auth flows, recipe sharing/import, and key edit paths). Maintain ≥65% coverage for libs/api/components.

## V2.0 feature requests

1. [ ] Extra columns
   1. [ ] Reference column to add the original link / place of the recipe
   1. [ ] Bereidingstijd, totale tijd etc.
   1. [ ] Add free form notes to the recipes, to for example keep track of when somebody ate this with whom
   1. [ ] Add whine section
1. [ ] Groccery shopping list
1. [ ] Menu creator functionality that combines multiple recipes, different options, week menu with 7 days, evenening menu with 3 courses
1. [ ] Patch notes, just use the the latest commit message and put it somewhere with a husky precommit hook. the site can then show the latest few version updates. Husky can automatically update when there is a new version an grab the latest commit messages that belong to that version
1. [ ] Create an integration that allows other AI agents to use meal-maestro functionality as well. Basically enabling a user of chatgpt to store recipes in meal-maestro without ever leaving the chatgpt interface.
1. [ ] Tiktok import

---
