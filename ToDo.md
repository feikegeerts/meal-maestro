# Post-MVP Development Roadmap

## Authentication & User Experience

1. [x] Google app for google login customize with meal maestro logo and text, might require approval from google
2. [x] Custom SMTP server for magic link emails
       2.5 [ ] there are still some routing issues when coming back, i don't want to be on the homepage but on recipes.
3. [ ] Main page should have AI less prominent and focus more on the recipe management and ease of adding recipes. Also use this as inspiration: https://popsa.com/en-gb/features/

## Advanced Recipe Features

4. [ ] AI can use Semantic search using vector embeddings in the recipes
5. [ ] Image upload and recipe photo management

## Performance & Infrastructure

## Analytics & Monetization

9. [ ] Metrics, what kind of metrics do we want, do we want to keep sending this to the admin dashbaord or think about something else?
10. [ ] Maximize the spend of a user in a given month, point them to the donate
11. [ ] Add bunq.me donation link for mobile-friendly bank transfers

## Quality & Compliance

12. [ ] Refactor codebase
13. [ ] Write more tests
14. [ ] Add account deletion GDPR proof, cost and usage tracking should stay but recipes and user profile should be deleted
15. [x] Feedback form on the about page

## Marketing & Documentation

16. [ ] SEO optimizations - Footer???
17. [ ] Changelog page
18. [ ] Localized email templates using vercel functions and sending emails from code using supabase auth hooks
19. [ ] Docs folder with some docs
20. [ ] the first magic link email seems to be a registration mail so that needs a template
