<script lang="ts">
  import { goto } from '$app/navigation';
  import RecipeList from '$lib/components/RecipeList.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import type { Recipe } from '$lib/types.js';
  import { isAuthenticated } from '$lib/stores/auth.js';
  import { toasts } from '$lib/stores/toastStore.js';
  import LoginButton from '$lib/components/LoginButton.svelte';

  function handleRecipeSelected(recipe: Recipe) {
    goto(`/recipes/${recipe.id}`);
  }

  function handleEditRecipe(recipe: Recipe) {
    goto(`/chat?prompt=${encodeURIComponent(`Edit the recipe "${recipe.title}"`)}`);
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
      <LoginButton />
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

  /* Tablet and desktop adjustments */
  @media (min-width: 768px) {
    .recipes-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }
  }
</style>