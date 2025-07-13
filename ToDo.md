# Todo List

- [ ] Scrape my linkedin profile for the data
- [ ] Add proper contents
- [ ] Add personal photo and introduction description
- [ ] Improve mobile view

# Project: LLM-Assisted Recipe Manager (with Voice + Action Log)

## Requirements

- Store recipes with the following fields:
  - `id`
  - `title`
  - `ingredients`
  - `description`
  - `category`
  - `tags`
  - `season`
  - `last_eaten`
- Use Supabase as the database
- Use OpenAI API key for both language model (GPT) and voice model (speech-to-text and text-to-speech)
- LLM-powered natural language interface for querying and updating recipes
- Users can talk to the assistant (voice input), and the assistant responds with speech (voice output)
- Interface shows a list/log of all actions the LLM performed on the database after each conversation

## TODOs

### 1. Database Setup (Supabase)
- [ ] Create a Supabase project and database
- [ ] Design a `recipes` table with fields: `id`, `title`, `ingredients`, `description`, `category`, `tags`, `season`, `last_eaten`
- [ ] (Optional) Add user authentication for multi-user support

### 2. Backend/API
- [ ] Set up API routes (Next.js API routes or Supabase Edge Functions) for:
  - [ ] Adding a recipe (with all fields)
  - [ ] Updating a recipe (especially `last_eaten`)
  - [ ] Retrieving recipes (supporting filter by any field)
- [ ] (Optional) Add semantic search using Supabase’s vector extension or a vector DB
- [ ] Log all database actions performed as a result of LLM queries (store action logs in the database or in memory)

### 3. Frontend (Next.js on Vercel)
- [ ] Implement UI forms/pages to:
  - [ ] Add a recipe
  - [ ] Update `last_eaten`
  - [ ] List/search/filter recipes
- [ ] Integrate voice input (speech-to-text) using OpenAI’s voice API (or Web Speech API as fallback)
- [ ] Integrate voice output (text-to-speech) using OpenAI’s TTS model
- [ ] Add a chat or conversation interface (accepts both voice and text)
- [ ] Display a list/log of all actions the LLM has performed on the database after each conversation (e.g., as a sidebar, bottom sheet, or separate panel)

### 4. LLM Integration
- [ ] Use OpenAI API key for:
  - [ ] LLM (GPT-4, GPT-3.5) for language understanding and conversation
  - [ ] Voice model (speech-to-text and TTS)
- [ ] Implement natural language to SQL/API logic (e.g., via LangChain, custom prompt engineering, or OpenAI function calling)
- [ ] Ensure every LLM-driven database action is recorded in the action log and displayed in the UI

### 5. User Experience
- [ ] Provide clear instructions for voice and text usage
- [ ] Show assistant responses both as text and as voice
- [ ] After every conversation, show a clear log of database actions (e.g., "Added recipe: Pesto Pasta", "Updated last_eaten: Lasagna")
- [ ] (Optional) Allow users to replay or review the action history

### 6. Deployment & Testing
- [ ] Deploy the web app on Vercel
- [ ] Manage environment variables (for OpenAI key, Supabase credentials)
- [ ] Test workflows: add, update, and retrieve recipes via both text and voice
- [ ] Test and refine the action log and voice interfaces

## Stretch Goals / Optional Features
- [ ] Multi-user support (authentication, user-specific logs/history)
- [ ] Undo/revert actions from the action log
- [ ] Image upload for recipes
- [ ] Notifications/reminders for recipes not eaten in a long time
- [ ] Progressive Web App (PWA) support for mobile usage
