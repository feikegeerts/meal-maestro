<script lang="ts">
  import { goto } from '$app/navigation';
  import RecipeList from '$lib/components/RecipeList.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import type { Recipe } from '$lib/types.js';
  import { isAuthenticated } from '$lib/stores/auth.js';
  import { toasts } from '$lib/stores/toastStore.js';
  import LoginForm from '$lib/components/LoginForm.svelte';

  function handleRecipeSelected(recipe: Recipe) {
    goto(`/recipes/${recipe.id}`);
  }

  function handleEditRecipe(recipe: Recipe) {
    goto(`/chat?prompt=${encodeURIComponent(`Edit the recipe "${recipe.title}"`)}`);
  }

  function handleAuthSuccess() {
    toasts.success('Welcome!', 'You can now browse your recipes.');
  }

  function handleAuthError(event: CustomEvent<{ message: string }>) {
    toasts.error('Sign In Error', event.detail.message);
  }
</script>

<svelte:head>
  <title>My Recipes - Meal Maestro</title>
</svelte:head>

<main class="recipes-page">
  {#if $isAuthenticated}
    <div class="recipes-container">
      <RecipeList
        onRecipeSelected={handleRecipeSelected}
        onEditRecipe={handleEditRecipe}
      />
    </div>
  {:else}
    <div class="auth-section">
      <div class="auth-card">
        <h1 class="auth-title">Sign In Required</h1>
        <p class="auth-subtitle">Please sign in to view and manage your recipes</p>
        <LoginForm 
          on:success={handleAuthSuccess}
          on:error={handleAuthError}
        />
      </div>
    </div>
  {/if}
</main>

<ToastContainer />

<style>
  .recipes-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--background, #f8fafc);
  }

  .recipes-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    flex: 1;
  }

  /* Auth Section */
  .auth-section {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    padding: 20px;
  }

  .auth-card {
    background: var(--surface, #ffffff);
    border-radius: 16px;
    padding: 32px 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--border, #e5e7eb);
    text-align: center;
    max-width: 400px;
    width: 100%;
  }

  .auth-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary, #111827);
    margin: 0 0 8px 0;
    letter-spacing: -0.01em;
  }

  .auth-subtitle {
    font-size: 14px;
    color: var(--text-secondary, #6b7280);
    margin: 0 0 24px 0;
    line-height: 1.4;
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .recipes-page {
      background: var(--background, #0f172a);
    }

    .auth-card {
      background: var(--surface, #1e293b);
      border-color: var(--border, #334155);
    }
  }

  /* Tablet and desktop adjustments */
  @media (min-width: 768px) {
    .recipes-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }
  }
</style>