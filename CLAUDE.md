@README.md for an overview of this project
@ToDo.md for a todo list of things that need to be done
@MIGRATION_SPEC.md for an overview of an old project on which this project is based
@old/src/lib for and overview of the services that were used in that old project

# Coding guidelines

**IMPORTANT**

- Do not add comments when the code is self explanatory

# Auth Notes

- Google OAuth PKCE: Use client-side callback page (`/auth/callback/page.tsx`), not server-side route. Supabase handles PKCE with `detectSessionInUrl: true`.
