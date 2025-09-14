# Post-MVP Development Roadmap

## User Experience

1. [x] Chat should be able to call a unit conversion function to convert TBSP or TSP to ml, g or whatever the user wants.
       [ ] Now the tbsp or tsp or ml or g should be an account setting so that users can get a certain default behavior from the chat.
1. [ ] Tags nakijken. Sommige tags zijn dubbel wbt betekenis.
1. [ ] Main page should have AI less prominent and focus more on the recipe management and ease of adding recipes. Also use this as inspiration: https://popsa.com/en-gb/features/

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
1. [ ] Dev database setup so we can test database changes before pushing to the cloud

## Marketing & Documentation

16. [ ] SEO optimizations - Footer???
17. [ ] PWA options to allow installing of the app

## V2.0 feature requests

1. [ ] A preference setting in the account that makes sure tbsp and tsp are not used but just ml and g is used.
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
