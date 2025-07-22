<script lang="ts">
  import Icon from '@iconify/svelte';
  import RecipeCard from '$lib/components/RecipeCard.svelte';
  import type { Recipe } from '$lib/types.js';
  
  export let recipe: Recipe | null = null;
  export let isLoading = false;
  export let title = 'Recipe';
  
  function clearRecipe() {
    recipe = null;
  }
</script>

<section class="recipe-display">
  <div class="display-header">
    <h3 class="display-title">{title}</h3>
    {#if recipe}
      <button class="clear-button" onclick={clearRecipe}>Clear</button>
    {/if}
  </div>
  
  <div class="display-content">
    {#if isLoading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading recipes...</p>
      </div>
    {:else if !recipe}
      <div class="empty-state">
        <div class="empty-icon"><Icon icon="lucide:utensils" width="3em" height="3em" /></div>
        <h4>No recipe to display</h4>
        <p>Ask Meal Maestro to search for a recipe or add a new one!</p>
      </div>
    {:else}
      <div class="recipe-container">
        <RecipeCard {recipe} />
      </div>
    {/if}
  </div>
</section>

<style>
  .recipe-display {
    background: transparent;
    border-radius: 0;
    border: none;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .display-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  .display-title {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.2rem;
    font-weight: 600;
  }

  .clear-button {
    background: var(--error);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }

  .clear-button:hover {
    background: var(--error-hover);
    transform: translateY(-1px);
  }

.display-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 0;
}

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
    color: var(--text-secondary);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border);
    border-top: 3px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: var(--text-secondary);
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.7;
  }

  .empty-state h4 {
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
  }

  .empty-state p {
    margin: 0;
    max-width: 300px;
    line-height: 1.5;
  }

  .recipe-container {
    display: flex;
    flex-direction: column;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    
    .display-header {
      padding: 1rem;
    }
    
    .display-content {
      padding: 0.0;
    }
  }

  @media (max-width: 480px) {
    .empty-icon {
      font-size: 3rem;
    }
    
    .empty-state h4 {
      font-size: 1.125rem;
    }
    
    .clear-button {
      padding: 0.375rem 0.75rem;
      font-size: 0.8rem;
    }
  }
</style>