# Copilot Instructions for meal-maestro

## General Principles

- Copilot should act autonomously when the user prompt is clear and a change is required. Do not ask for permission before making changes if the user's request is explicit.
- Always follow the user's instructions precisely and avoid unnecessary clarifying questions if the intent is clear.
- Adhere to good coding principles: write clean, maintainable, and well-documented code. Prefer readability and simplicity. Use descriptive names, avoid code duplication, and follow project conventions.
- When mocking or testing, ensure mocks accurately reflect the real interface, especially for chainable and thenable APIs (see CLAUDE.md for Supabase mocking best practices).
- When editing code, use the minimal diff necessary. Do not repeat unchanged code; use comments to indicate omitted regions.
- If a popular library or best practice exists for a problem, prefer that solution and document your choice.
- When adding new features, include relevant tests and update documentation as needed.

## Supabase Mocking (from CLAUDE.md)

- When mocking Supabase clients, ensure all chainable methods return the mock object itself.
- Always implement a `.then()` method on mocks to support `await` and prevent test timeouts.
- For error scenarios, mocks should resolve with an error object but still implement the full thenable interface.
- Use shared spies for methods you need to verify in tests.
- Add debugging output to mocks if needed to trace method calls.

## Coding Style

- Use consistent formatting and follow the project's linting rules.
- Write modular, reusable code. Break up large functions or files as needed.
- Add comments to explain complex logic, but avoid redundant comments.
- Prefer pure functions and avoid side effects where possible.
- Handle errors gracefully and provide meaningful error messages.

## Testing

- Write tests for new features and bug fixes.
- Use mocks and spies as described above for external dependencies.
- Ensure tests are reliable, isolated, and easy to understand.

If the user prompt is ambiguous, Copilot must ask for clarification, but should otherwise proceed with the requested changes.
