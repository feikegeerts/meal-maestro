# Post-MVP Development Roadmap

## User Experience

1.  [ ] Tags nakijken. Sommige tags zijn dubbel wbt betekenis.
1.  [ ] Main page should have AI less prominent and focus more on the recipe management and ease of adding recipes. Also use this as inspiration: https://popsa.com/en-gb/features/

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

Auth debugging logs:
Hard Refresh:
07:20:46.853 Starting token sync with server 2 auth-context.tsx:148:13
07:20:46.987 [Fast Refresh] rebuilding turbopack-hot-reloader-common.ts:41:15
07:20:47.032 [Fast Refresh] done in 148ms report-hmr-latency.ts:26:11
07:20:47.036 Token sync with server completed successfully 2 auth-context.tsx:171:17
07:20:47.136 Starting token sync with server auth-context.tsx:148:13
07:20:47.262 [Fast Refresh] rebuilding turbopack-hot-reloader-common.ts:41:15
07:20:47.267 [Fast Refresh] done in 108ms report-hmr-latency.ts:26:11
07:20:47.369 [Fast Refresh] rebuilding turbopack-hot-reloader-common.ts:41:15
07:20:47.938 [Fast Refresh] done in 671ms report-hmr-latency.ts:26:11
07:20:48.040 [Fast Refresh] rebuilding turbopack-hot-reloader-common.ts:41:15
07:20:48.161 [Fast Refresh] done in 223ms report-hmr-latency.ts:26:11
07:20:48.163
Failed to sync tokens with server (attempt 1/3): Error: HTTP 500: Internal Server Error
syncTokensWithServer auth-context.tsx:163
intercept-console-error.ts:44:26
error intercept-console-error.ts:44
syncTokensWithServer auth-context.tsx:174
07:20:48.163 Retrying token sync in 1000ms auth-context.tsx:188:17
07:20:49.231 Token sync with server completed successfully auth-context.tsx:171:17
07:20:49.357 Starting token sync with server auth-context.tsx:148:13
07:20:49.413 Token sync with server completed successfully auth-context.tsx:171:17
07:20:49.543 Starting token sync with server auth-context.tsx:148:13
07:20:49.593 Token sync with server completed successfully

Logout and then login
XHRGET
http://localhost:3000/api/custom-units
[HTTP/1.1 401 Unauthorized 189ms]

07:34:04.786 Starting token sync with server auth-context.tsx:148:13
07:34:04.802
XHRGET
http://localhost:3000/api/recipes
[HTTP/1.1 401 Unauthorized 181ms]

07:34:04.812 Starting token sync with server auth-context.tsx:148:13
07:34:04.841
XHRGET
http://localhost:3000/api/recipes
[HTTP/1.1 401 Unauthorized 154ms]

07:34:04.878
XHRGET
http://localhost:3000/api/recipes
[HTTP/1.1 401 Unauthorized 141ms]

07:34:04.914 [Fast Refresh] rebuilding turbopack-hot-reloader-common.ts:41:15
07:34:04.984 [Fast Refresh] done in 172ms report-hmr-latency.ts:26:11
07:34:05.031 Token sync with server completed successfully 2 auth-context.tsx:171:17
07:34:05.148 Starting token sync with server auth-context.tsx:148:13
07:34:05.219 Token sync with server completed successfully auth-context.tsx:171:17
07:34:05.329 Starting token sync with server auth-context.tsx:148:13
07:34:05.413 Token sync with server completed successfully auth-context.tsx:171:17
07:34:05.454 [Fast Refresh] rebuilding turbopack-hot-reloader-common.ts:41:15
07:34:05.489 [Fast Refresh] done in 140ms report-hmr-latency.ts:26:11
07:34:05.514 Starting token sync with server auth-context.tsx:148:13
07:34:05.674 Token sync with server completed successfully
