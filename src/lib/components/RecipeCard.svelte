<script lang="ts">
  import type { Recipe } from '$lib/types.js';
  
  export let recipe: Recipe;
  
  function formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'breakfast': '#ff6b6b',
      'lunch': '#4ecdc4',
      'dinner': '#45b7d1',
      'dessert': '#96ceb4',
      'snack': '#ffeaa7',
      'appetizer': '#fd79a8',
      'beverage': '#a29bfe'
    };
    return colors[category.toLowerCase()] || '#74b9ff';
  }
</script>

<div class="recipe-card">
  <div class="recipe-header">
    <h3 class="recipe-title">{recipe.title}</h3>
    <div class="recipe-meta">
      <span class="category-badge" style="background-color: {getCategoryColor(recipe.category)}">
        {recipe.category}
      </span>
      {#if recipe.season}
        <span class="season-badge">🌿 {recipe.season}</span>
      {/if}
    </div>
  </div>

  <div class="recipe-body">
    <div class="ingredients-section">
      <h4 class="section-title">📋 Ingredients</h4>
      <ul class="ingredients-list">
        {#each recipe.ingredients as ingredient}
          <li class="ingredient-item">{ingredient}</li>
        {/each}
      </ul>
    </div>

    <div class="instructions-section">
      <h4 class="section-title">👨‍🍳 Instructions</h4>
      <div class="instructions-content">
        {recipe.description}
      </div>
    </div>

    {#if recipe.tags && recipe.tags.length > 0}
      <div class="tags-section">
        <h4 class="section-title">🏷️ Tags</h4>
        <div class="tags-container">
          {#each recipe.tags as tag}
            <span class="tag">{tag}</span>
          {/each}
        </div>
      </div>
    {/if}

    {#if recipe.last_eaten}
      <div class="last-eaten-section">
        <span class="last-eaten-label">🍽️ Last enjoyed:</span>
        <span class="last-eaten-date">{formatDate(recipe.last_eaten)}</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .recipe-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.5rem;
    margin: 1rem 0;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06);
    transition: all 0.3s ease;
    max-width: 100%;
    animation: slideIn 0.3s ease-out;
  }

  .recipe-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04);
  }

  .recipe-header {
    margin-bottom: 1.5rem;
    border-bottom: 2px solid var(--border);
    padding-bottom: 1rem;
  }

  .recipe-title {
    color: var(--text-primary);
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.75rem 0;
    line-height: 1.3;
  }

  .recipe-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .category-badge {
    color: white;
    padding: 0.375rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: capitalize;
    box-shadow: 0 2px 4px rgb(0 0 0 / 0.1);
  }

  .season-badge {
    background: var(--background);
    color: var(--text-secondary);
    padding: 0.375rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid var(--border);
  }

  .recipe-body {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .section-title {
    color: var(--text-primary);
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 0.75rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .ingredients-section {
    background: var(--background);
    padding: 1.25rem;
    border-radius: 12px;
    border: 1px solid var(--border);
  }

  .ingredients-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.5rem;
  }

  .ingredient-item {
    color: var(--text-secondary);
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
    position: relative;
    padding-left: 1.5rem;
  }

  .ingredient-item:last-child {
    border-bottom: none;
  }

  .ingredient-item::before {
    content: "•";
    color: var(--primary);
    position: absolute;
    left: 0;
    font-weight: bold;
    font-size: 1.2rem;
  }

  .instructions-section {
    background: var(--background);
    padding: 1.25rem;
    border-radius: 12px;
    border: 1px solid var(--border);
  }

  .instructions-content {
    color: var(--text-secondary);
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .tags-section {
    background: var(--background);
    padding: 1.25rem;
    border-radius: 12px;
    border: 1px solid var(--border);
  }

  .tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    background: var(--primary);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 16px;
    font-size: 0.875rem;
    font-weight: 500;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
  }

  .last-eaten-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--background);
    border-radius: 12px;
    border: 1px solid var(--border);
  }

  .last-eaten-label {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .last-eaten-date {
    color: var(--text-primary);
    font-weight: 600;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .recipe-card {
      padding: 1rem;
      margin: 0.75rem 0;
    }

    .recipe-title {
      font-size: 1.25rem;
    }

    .recipe-meta {
      gap: 0.5rem;
    }

    .category-badge,
    .season-badge {
      font-size: 0.8rem;
      padding: 0.25rem 0.5rem;
    }

    .ingredients-section,
    .instructions-section,
    .tags-section {
      padding: 1rem;
    }

    .section-title {
      font-size: 1rem;
    }

    .tags-container {
      gap: 0.375rem;
    }

    .tag {
      font-size: 0.8rem;
      padding: 0.25rem 0.5rem;
    }

    .last-eaten-section {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
  }

  @media (max-width: 480px) {
    .recipe-card {
      padding: 0.75rem;
      border-radius: 12px;
    }

    .recipe-title {
      font-size: 1.125rem;
    }

    .recipe-meta {
      flex-direction: column;
      align-items: flex-start;
    }

    .ingredients-section,
    .instructions-section,
    .tags-section {
      padding: 0.75rem;
    }

    .ingredient-item {
      padding: 0.375rem 0 0.375rem 1.25rem;
    }
  }
</style>