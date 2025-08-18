### Phase 5: Post-MVP Enhancements

- [x] datum notatie localization
- [x] optimize translations
- [x] categorieen aanpassen naar die AH.nl ook gebruikt.
- [x] every key press in the ingredient edit is blurring the input field making it impossible to properly type or edit
- [x] The unit list in the ingredient dropdown is too large needs to be optimized

- [x] the avatar doesn;t have a hover state so it's not clear it's a clickable item.
- [x] add cookie consent message to login?
- [x] use typescript types everywhere instead of hardcoded lists of tags categories and seasons.
- [x] login using magic link from supabase
- [x] **5.9** Implement languages Dutch and English
- [x] The ai should as much as possible prefil the form even when asking more questions. Currently the AI either fills in the form and gives a generic response, or asks questions. We want to make number of chat interactions as low as possible and currently it's impossible to get a recipe after 1 chat because the AI always asks follow ups.
- [ ] Header met back button is niet heel mooi, misschien beter breadcrumb op tweede lijn
- [ ] ah.nl layouts overnemen zowel desktop als mobile voor recepten weergeven en toevoegen
- [ ] structed ingredient table layout is beetje gek met de headers onderaan
- [ ] custom smtp server for magic link emails
- [ ] **5.11** Implement caching strategies
- [ ] **5.12** Add buy me a coffee functionality
- [ ] **5.13** Improve deployment pipeline with automatic version bumping
- [ ] About page with version and release notes
- [ ] Google app for google login customize with meal meastro logo and text, might require approval from google

### Phase 5.5 URL fetching and processing.

- [x] **5.5.1** Create webscraper component with multi-layer extraction (JSON-LD → Meta tags → HTML parsing)
- [x] **5.5.2** Integrate URL detection and extraction into AI chat system
- [x] **5.5.3** Add security measures (rate limiting, URL validation, timeout protection)
- [x] **5.5.4** Enhance error messaging with domain-specific suggestions for blocked sites
- [x] **5.5.5** Create streamlined copy-paste recipe processing functionality (AI handles via update_recipe_form)
- [ ] **5.5.6** Add support for pasting screenshots into chat for AI recipe extraction
- [x] **5.5.7** Create AI function to parse manually pasted recipe text (removed - AI handles naturally)
- [x] **5.5.8** Improve AI chat responses for blocked/failed scraping with actionable suggestions

### Phase 6: Voice Integration

### Phase 7: Advanced Features

- [ ] **7.1** Semantic search using vector embeddings
- [ ] **7.6** Image upload and recipe photo management

### Phase 8: Analytics & Optimization

- [ ] **9.1** Usage analytics and metrics
- [ ] **9.2** Performance monitoring

### Phase 9: Quality of life

- [ ] refactor
- [ ] write more tests
