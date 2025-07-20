---
# Localization Implementation Plan

## Dutch Primary, English Secondary

### Overview

Create a comprehensive i18n system for the SvelteKit application with Dutch as the primary language and English as secondary. This plan addresses UI localization, database content, and user-generated multilingual content handling.
---

## Phase 1: Infrastructure Setup

### 1.1 Install i18n Library

- Install `svelte-i18n` package for internationalization
- Configure TypeScript support for translation keys
- Set up build configuration for language assets

### 1.2 Create Translation Structure

- Create `src/lib/translations/` directory structure:
  - `nl.json` (Dutch - primary language)
  - `en.json` (English - secondary language)
- Organize translations by component/feature areas
- Set up translation key naming conventions

### 1.3 Language Detection & Storage

- Implement browser language detection
- Create language preference storage in `localStorage`
- Set up reactive language store using Svelte stores
- Configure Dutch as default fallback language

---

## Phase 2: UI Component Localization

### 2.1 Core Navigation & Layout (~50 strings)

**Files to update:**

- `src/routes/+page.svelte` - Homepage content
- `src/routes/+layout.svelte` - Navigation elements
- `src/lib/components/ThemeToggle.svelte` - Theme switcher
- `src/lib/components/PageHeader.svelte` - Headers

**Key translations needed:**

- Site title, navigation labels, theme toggle text
- Homepage: "Mijn persoonlijke hub voor alles wat nuttig is"
- Navigation tiles: "Thuisassistent", "Carrière", "Maaltijd Maestro"

### 2.2 Career Timeline (~30 strings)

**Files to update:**

- `src/routes/career/+page.svelte`
- `src/lib/components/LoginForm.svelte`
- `src/lib/components/TimelineView.svelte`

**Key translations needed:**

- "Mijn Carrière Tijdlijn", "Wachtwoord vereist", "Voor privacy redenen..."
- Form labels: "Voer wachtwoord in", "Inloggen", "Authenticeren..."

### 2.3 Meal Maestro Interface (~80 strings)

**Files to update:**

- `src/routes/meal-maestro/+page.svelte`
- `src/lib/components/RecipeList.svelte`
- `src/lib/components/ChatInput.svelte`
- `src/lib/components/VoiceInput.svelte`
- `src/lib/components/RecipeDisplay.svelte`

**Key translations needed:**

- "Jouw AI-aangedreven recept assistent"
- Search: "Zoek recepten, ingrediënten, tags..."
- Filters: "Alle Categorieën", "Alle Seizoenen"
- Actions: "Markeer als gegeten", "Bewerk recept", "Verwijder"

### 2.4 Error Messages & Toasts (~40 strings)

**Files to update:**

- `src/lib/components/Toast.svelte`
- All API error responses
- Loading states and validation messages

---

## Phase 3: Database Content Localization

### 3.1 Recipe Enum Translations

Create mapping objects for:

- Recipe categories: ontbijt, lunch, diner, dessert, snack, voorgerecht, drank
- Seasons: lente, zomer, herfst, winter, het hele jaar
- Recipe tags: Map all 150+ English tags to Dutch equivalents

### 3.2 Career Timeline Data

Options for career data:

- **Option A:** Migrate Edge Config to database with language columns
- **Option B:** Keep current structure, add translation layer in API
- **Recommended:** Start with Option B for minimal disruption

### 3.3 Mixed Language Content Strategy

For user-generated recipes:

- Add language field to recipes table (`nl` | `en` | `mixed`)
- Auto-detect language of recipe content using simple heuristics
- Allow language filtering in search
- Display language indicator in recipe cards

---

## Phase 4: API Localization

### 4.1 Update API Responses (~25 endpoints)

**Files to update:**

- `src/routes/api/auth/+server.ts`
- `src/routes/api/recipes/+server.ts`
- `src/routes/api/recipes/[id]/+server.ts`
- `src/routes/api/recipes/chat/+server.ts`
- All other API endpoints

**Implement:**

- Accept `Accept-Language` header
- Return localized error messages
- Translate enum values in responses
- Update OpenAI system prompts for Dutch interaction

### 4.2 Database Schema Updates

```sql
-- Add language support to recipes
ALTER TABLE recipes ADD COLUMN language TEXT DEFAULT 'nl';
ALTER TABLE recipes ADD COLUMN title_en TEXT;
ALTER TABLE recipes ADD COLUMN description_en TEXT;

-- Create translation table for enum values (optional)
CREATE TABLE enum_translations (
  enum_type TEXT,
  enum_value TEXT,
  language TEXT,
  translated_value TEXT,
  PRIMARY KEY (enum_type, enum_value, language)
);
```

---

## Phase 5: Advanced Features

### 5.1 Language Switcher Component

- Create `LanguageToggle.svelte` component
- Add to main navigation alongside theme toggle
- Persist language preference
- Update URL params for language (optional)

### 5.2 OpenAI Integration

- Update system prompts to work in Dutch
- Handle mixed-language conversations
- Translate function calling descriptions
- Update voice input/output to support Dutch

### 5.3 Date & Number Formatting

- Use Dutch locale for date formatting
- Update formatDate functions throughout app
- Handle Dutch number formatting
- Time zone considerations (Europe/Amsterdam)

---

## Phase 6: Testing & Quality Assurance

### 6.1 Translation Testing

- Verify all UI strings are translated
- Test language switching functionality
- Validate translation key consistency
- Check for missing translations

### 6.2 Content Testing

- Test mixed-language recipe handling
- Verify enum translation mappings
- Test API language header handling
- Validate OpenAI Dutch interactions

---

## Implementation Strategy

### Priority Order

1. **High Priority:** Core UI components (Navigation, Forms, Buttons)
2. **Medium Priority:** Recipe interface, error messages
3. **Low Priority:** Advanced features, OpenAI integration

### Estimated Effort

- Phase 1-2: 3-4 days (Infrastructure + Core UI)
- Phase 3-4: 4-5 days (Database + API)
- Phase 5-6: 2-3 days (Advanced features + Testing)
- **Total:** 9-12 days for complete implementation

### Success Criteria

- All UI text displays in Dutch by default
- Users can switch to English seamlessly
- Recipe content handles mixed languages gracefully
- API responses are properly localized
- No broken functionality after localization

---
