# Test Plan — RecipeValidator Refactor

Smoke-test checklist for verifying the `RecipeValidator` service class refactor.
All validation logic was extracted from the two route files into `src/lib/recipe-validator.ts`.
Unit tests cover the service class itself (292 passing); this plan covers manual end-to-end verification.

---

## 1. Create a recipe (POST `/api/recipes`)

### Happy path
- [ ] Fill in all fields (title, ingredients, servings, category, description) and save
- [ ] Verify the recipe appears correctly in the list and detail view

### Unit normalization
- [ ] Add an ingredient with unit `teen` or `teentje` → should save as `clove`
- [ ] Add an ingredient with unit `el` or `eetlepel` → should save as `tbsp`
- [ ] Add an ingredient with unit `tl` or `theelepel` → should save as `tsp`
- [ ] Add an ingredient with unit `stuk`, `stuks`, or `pieces` → should save with `unit: null`
- [ ] Add an ingredient with an unrecognised unit (e.g. `handful`) → should save with `unit: null`
- [ ] Add an ingredient with unit `naar smaak` or `to taste` → should be preserved as-is

### Time field behaviour
- [ ] Enter prep time (10) and cook time (20), leave total time empty → total should save as 30
- [ ] Enter prep (10), cook (20), and total (60) explicitly → total should save as 60 (not auto-calculated)
- [ ] Add an ingredient with amount `0` → should save with `amount: null`

### Sections recipe
- [ ] Create a recipe using sections instead of a flat ingredient list
- [ ] Verify sections save with correct titles, instructions, and per-section ingredients
- [ ] Verify Dutch unit normalization applies inside section ingredients too

---

## 2. Validation errors on create

- [ ] Submit without title, category, or servings → expect 400 "Missing required fields"
- [ ] Submit with no ingredients and no sections → expect 400
- [ ] Submit with no description and no sections → expect 400
- [ ] Enter `-5` for prep time → expect validation error "cannot be negative"
- [ ] Enter `12.5` for cook time → expect validation error "must be a whole number"
- [ ] Paste a string >1024 chars into reference → expect validation error
- [ ] Paste a string >255 chars into wine pairing → expect validation error
- [ ] Paste a string >4000 chars into notes → expect validation error
- [ ] Submit an ingredient with no name → expect "Each ingredient must have an id and name"
- [ ] Submit an ingredient with a negative amount → expect "Ingredient amounts must be positive numbers or null"
- [ ] Submit a section with no title → expect section validation error
- [ ] Submit a section with no instructions → expect section validation error
- [ ] Submit a section with no ingredients → expect section validation error

---

## 3. Edit a recipe (PUT `/api/recipes/[id]`)

### Unit normalization on edit
- [ ] Change an ingredient unit to `stuks` → should save with `unit: null`
- [ ] Change an ingredient unit to `el` → should save as `tbsp`

### Time fields on edit
- [ ] Update prep time and cook time, leave total empty → total should auto-update
- [ ] Update only cook time → total should recalculate using existing prep time

### Partial updates
- [ ] Update only the title → all other fields should remain unchanged
- [ ] Update only servings → other fields unchanged

### Clearing optional fields
- [ ] Send `reference: ""` → should save as `null`
- [ ] Send `pairing_wine: ""` → should save as `null`
- [ ] Send `notes: ""` → should save as `null`

### Section edits
- [ ] Modify a section title → change should persist
- [ ] Add an ingredient to a section → change should persist
- [ ] Dutch unit in a section ingredient on edit → should normalize correctly

---

## 4. Smoke test remaining endpoints

- [ ] **GET `/api/recipes`** — recipe list loads without errors
- [ ] **GET `/api/recipes/[id]`** — individual recipe page loads correctly
- [ ] **DELETE** (single recipe) — recipe is removed from the list
- [ ] **DELETE** (bulk) — multiple recipes are removed correctly
- [ ] **PATCH mark_as_eaten** — last eaten date updates correctly
