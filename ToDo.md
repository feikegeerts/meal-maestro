### Phase 5: Post-MVP Enhancements

- [ ] **URGENT** Fix mobile photo upload timeout issue - 25s Vercel limit causing SIGTERM
- [ ] Implement client-side image compression using existing image-conversion.ts utility  
- [ ] Reduce OpenAI timeout from 25s to 20s to avoid Vercel SIGTERM race condition
- [ ] Add image size validation and compression in chat interface before upload
- [ ] Test mobile photo upload performance with compressed images
- [ ] chat interface header needs to be localized.
- [ ] automatic version bump in the about page
- [ ] **5.12** Add buy me a coffee functionality, with stripe or ko-fi
- [ ] Costs overview of running the app on the about page?
- [ ] Google app for google login customize with meal meastro logo and text, might require approval from google
- [ ] Main page should have ai less promenent and focus more on the recipe management and easy of adding recipes. also use this as inspiration: https://popsa.com/en-gb/features/
- [ ] custom smtp server for magic link emails
- [ ] Secure code scanning
- [ ] **5.11** Implement caching strategies

### Phase 6: Advanced Features

- [ ] ??? **7.1** Semantic search using vector embeddings ???
- [ ] **7.6** Image upload and recipe photo management

### Phase 7: Analytics & Optimization

- [ ] **9.1** Usage analytics and metrics
- [ ] **9.2** Performance monitoring

### Phase 8: Quality of life

- [ ] refactor
- [ ] write more tests
- [ ] add account deletion GDPR proof, cost and usage tracking should stay but recipes and user profile should be deleted
