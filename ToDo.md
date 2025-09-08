# Post-MVP Development Roadmap

## User Experience

1.  [ ] Refresh token logic seems to be broken, this might be due to multiple tabs being open. Actually when testing this some more this also happens with a single tab.
        1/1
        Next.js 15.4.4 (stale)Turbopack
        Console AuthApiError

                Invalid Refresh Token: Already Used

                Call Stack 3
                AuthError
                file:/Users/fgeerts/Documents/GitProjects/meal-maestro/.next/static/chunks/4294a_%40supabase_auth-js_dist_module_6a384352._.js (79:9)
                AuthApiError
                file:/Users/fgeerts/Documents/GitProjects/meal-maestro/.next/static/chunks/4294a_%40supabase_auth-js_dist_module_6a384352._.js (91:9)
                handleError
                file:/Users/fgeerts/Documents/GitProjects/meal-maestro/.next/static/chunks/4294a_%40supabase_auth-js_dist_module_6a384352._.js (812:11)

1.  [ ] Tags nakijken. Sommige tags zijn dubbel wbt betekenis.
1.  [ ] The automatic redirect to /recipes is very anoying when you are on a different page. I think we do need redirect logic. This will interfere with the magic link functionality possible so that needs to be properly tested.
1.  [ ] Mark as easten should also be able for a different date
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
18. [ ] Add a tile view with the recipe photos next to the list view

## V2.0 feature requests

Tiktok import
Reference column to add the original link / place of the recipe
