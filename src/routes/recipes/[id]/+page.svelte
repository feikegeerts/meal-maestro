<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import RecipeDisplay from '$lib/components/RecipeDisplay.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import { apiClient } from '$lib/services/authenticatedFetch.js';
  import type { Recipe } from '$lib/types.js';
  import { isAuthenticated } from '$lib/stores/auth.js';
  import { toasts } from '$lib/stores/toastStore.js';
  import LoginButton from '$lib/components/LoginButton.svelte';
import Icon from '@iconify/svelte';

  let recipe: Recipe | null = null;
  let isLoading = true;
  let error = '';
  let recipeId = '';

  $: recipeId = $page.params.id;

  async function loadRecipe() {
    if (!recipeId) return;

    try {
      isLoading = true;
      error = '';
      
      const response = await apiClient.get(`/api/recipes/${recipeId}`);
      
      if (response.ok) {
        const data = await response.json();
        recipe = data.recipe;
      } else if (response.status === 404) {
        error = 'Recipe not found';
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load recipe');
      }
    } catch (err) {
      console.error('Error loading recipe:', err);
      error = 'Failed to load recipe';
      toasts.error('Load Error', 'Failed to load recipe');
    } finally {
      isLoading = false;
    }
  }

  async function handleMarkAsEaten() {
    if (!recipe) return;

    try {
      const response = await apiClient.post(`/api/recipes/${recipe.id}/eaten`);

      if (response.ok) {
        const data = await response.json();
        recipe = data.recipe;
        if (recipe) {
          toasts.success('Recipe Updated', `Marked "${recipe.title}" as eaten today`);
        } else {
          toasts.success('Recipe Updated', 'Marked recipe as eaten today');
        }
      } else {
        throw new Error('Failed to mark recipe as eaten');
      }
    } catch (err) {
      console.error('Error marking recipe as eaten:', err);
      toasts.error('Update Error', 'Failed to mark recipe as eaten');
    }
  }

  function handleEditRecipe() {
    if (recipe) {
      goto(`/chat?prompt=${encodeURIComponent(`Edit the recipe "${recipe.title}"`)}`);
    }
  }

  function handleBackToRecipes() {
    goto('/');
  }

  onMount(() => {
    if ($isAuthenticated && recipeId) {
      loadRecipe();
    }
  });

  // Watch for authentication changes
  $: if ($isAuthenticated && recipeId) {
    loadRecipe();
  }

  // Watch for route changes (recipe ID changes)
  $: if (recipeId && $isAuthenticated) {
    loadRecipe();
  }
</script>

<svelte:head>
  <title>{recipe?.title || 'Recipe'} - Meal Maestro</title>
</svelte:head>

<main class="recipe-detail-page">
  {#if $isAuthenticated}
    <div class="recipe-detail-container">
      <!-- Header with Back Button -->
      <header class="detail-header">
        <button
          class="back-button"
          onclick={handleBackToRecipes}
          aria-label="Back to recipes"
          type="button"
        >
          <span class="back-icon">
            <Icon icon="lucide:arrow-left" width="18" height="18" />
          </span>
          <span class="back-text">Recipes</span>
        </button>
        
        {#if recipe}
          <div class="header-actions">
            <button
              class="action-button secondary"
              onclick={handleMarkAsEaten}
              aria-label="Mark as eaten today"
              type="button"
            >
              <span class="action-icon">
                <Icon icon="lucide:check" width="16" height="16" />
              </span>
              <span class="action-text">Mark as Eaten</span>
            </button>
            
            <button
              class="action-button primary"
              onclick={handleEditRecipe}
              aria-label="Edit recipe"
              type="button"
            >
              <span class="action-icon">
                <Icon icon="lucide:pencil" width="16" height="16" />
              </span>
              <span class="action-text">Edit</span>
            </button>
          </div>
        {/if}
      </header>

      <!-- Recipe Content -->
      <div class="recipe-content">
        {#if isLoading}
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading recipe...</p>
          </div>
        {:else if error}
          <div class="error-state">
            <span class="error-icon">
              <Icon icon="lucide:alert-circle" width="48" height="48" />
            </span>
            <h2 class="error-title">Recipe Not Found</h2>
            <p class="error-text">The recipe you're looking for doesn't exist or has been removed.</p>
            <button 
              class="error-action"
              onclick={handleBackToRecipes}
              type="button"
            >
              Back to Recipes
            </button>
          </div>
        {:else if recipe}
          <RecipeDisplay
            {recipe}
            isLoading={false}
            title={recipe.title}
          />
        {/if}
      </div>
    </div>
  {:else}
    <LoginButton />
  {/if}
</main>

<ToastContainer />

<style>
  .recipe-detail-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--background, #f8fafc);
  }

  .recipe-detail-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* Header */
  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    gap: 16px;
  }

  .back-button {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    padding: 8px 12px;
    border-radius: 8px;
    transition: all 0.2s ease;
    min-height: 44px;
  }

  .back-button:hover {
    background: var(--hover);
    color: var(--primary);
  }

  .back-button:active {
    transform: scale(0.98);
  }

  .back-icon {
    font-size: 18px;
    line-height: 1;
  }

  .back-text {
    font-size: 16px;
    line-height: 1;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .action-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
    min-height: 40px;
  }

  .action-button.secondary {
    background: var(--background);
    color: var(--text-primary);
    border-color: var(--border);
  }

  .action-button.secondary:hover {
    background: var(--surface);
    border-color: var(--primary-light);
    color: var(--primary);
  }

  .action-button.primary {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }

  .action-button.primary:hover {
    background: var(--primary-dark);
    border-color: var(--primary-dark);
    transform: translateY(-1px);
  }

  .action-button:active {
    transform: scale(0.98);
  }

  .action-icon {
    font-size: 14px;
    line-height: 1;
  }

  .action-text {
    font-size: 13px;
    line-height: 1;
  }

  /* Recipe Content */
  .recipe-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 16px;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top: 3px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-state p {
    color: var(--text-secondary);
    margin: 0;
    font-size: 14px;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    text-align: center;
    gap: 16px;
    padding: 40px 20px;
  }

  .error-icon {
    font-size: 64px;
    opacity: 0.5;
  }

  .error-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .error-text {
    color: var(--text-secondary);
    font-size: 14px;
    margin: 0;
    line-height: 1.5;
    max-width: 300px;
  }

  .error-action {
    background: var(--primary);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 44px;
  }

  .error-action:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
  }

  .error-action:active {
    transform: scale(0.98);
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Tablet and desktop adjustments */
  @media (min-width: 768px) {
    .recipe-detail-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .detail-header {
      padding: 20px 32px;
    }

    .recipe-content {
      padding: 32px;
    }

    .action-button {
      padding: 10px 16px;
      min-height: 44px;
    }

    .action-text {
      font-size: 14px;
    }

    .action-icon {
      font-size: 16px;
    }
  }

  /* Hide action text on very small screens */
  @media (max-width: 480px) {
    .action-text {
      display: none;
    }

    .action-button {
      padding: 8px;
      min-width: 40px;
    }
  }
</style>