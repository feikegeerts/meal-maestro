<script lang="ts">
  import { filteredRecipes, hasActiveSearch, isLoading, recipeStore, recipes, searchFilters, searchResultCount } from '$lib/stores/recipeStore.js';
  import { toasts } from '$lib/stores/toastStore.js';
  import type { Recipe } from '$lib/types.js';
  import { onMount } from 'svelte';
  import { Icon } from '@steeze-ui/svelte-icon';
import { Cake, MagnifyingGlass, PencilSquare, Trash, CheckCircle, ArrowLeft, ArrowRight, ClipboardDocumentList } from '@steeze-ui/heroicons';
  
  // Callback props for actions that still need parent interaction
  export let onRecipeSelected: ((recipe: Recipe) => void) | undefined = undefined;
  export let onEditRecipe: ((recipe: Recipe) => void) | undefined = undefined;
  
  
  let error = '';
  let currentPage = 1;
  let itemsPerPage = 12;
  let sortBy = 'created_at';
  let sortOrder = 'desc';
  let localSearchQuery = '';
  let localSelectedCategory = '';
  let localSelectedSeason = '';
  
  // Reactive values from store
  $: sortedRecipes = filterAndSortRecipes($filteredRecipes, sortBy, sortOrder);
  $: totalPages = Math.ceil(sortedRecipes.length / itemsPerPage);
  $: paginatedRecipes = sortedRecipes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  $: categories = [...new Set($recipes.map(r => r.category))].sort();
  $: seasons = [...new Set($recipes.map(r => r.season).filter(Boolean))].sort();
  
  // Sync local filters with store (only when store changes)
  $: localSearchQuery = $searchFilters.query || '';
  $: localSelectedCategory = $searchFilters.category || '';
  $: localSelectedSeason = $searchFilters.season || '';
  
  // Debug logging removed - clean interface ready for production
  
  onMount(() => {
    fetchRecipes();
  });
  
  async function fetchRecipes() {
    try {
      recipeStore.setLoading(true);
      error = '';
      
      const response = await fetch('/api/recipes', {
        credentials: 'include' // Include cookies for authentication
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recipes');
      }
      
      recipeStore.setRecipes(data.recipes || []);
    } catch (err) {
      console.error('Error fetching recipes:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recipes';
      error = errorMessage;
      recipeStore.setError(errorMessage);
    } finally {
      recipeStore.setLoading(false);
    }
  }
  
  function filterAndSortRecipes(recipes: Recipe[], sortBy: string, sortOrder: string): Recipe[] {
    let filtered = [...recipes];
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'last_eaten':
          aValue = a.last_eaten ? new Date(a.last_eaten).getTime() : 0;
          bValue = b.last_eaten ? new Date(b.last_eaten).getTime() : 0;
          break;
        case 'created_at':
        default:
          aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
          bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }
  
  function handleRecipeClick(recipe: Recipe) {
    onRecipeSelected?.(recipe);
  }
  
  async function handleMarkEaten(recipe: Recipe, event: Event) {
    event.stopPropagation();
    
    // Add loading state to the specific recipe
    const loadingToastId = toasts.info(`Marking "${recipe.title}" as eaten...`, '', { duration: 0 });
    
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          id: recipe.id,
          last_eaten: new Date().toISOString()
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark recipe as eaten');
      }
      
      // Update the store with the updated recipe
      recipeStore.updateRecipe(data.recipe);
      
      // Remove loading toast and show success
      toasts.remove(loadingToastId);
      toasts.success(`Marked "${recipe.title}" as eaten!`);
      
    } catch (err) {
      console.error('Error marking recipe as eaten:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark recipe as eaten';
      
      // Remove loading toast and show error
      toasts.remove(loadingToastId);
      toasts.error('Error', errorMessage);
    }
  }
  
  function handleEditRecipe(recipe: Recipe, event: Event) {
    event.stopPropagation();
    onEditRecipe?.(recipe);
  }
  
  async function handleDeleteRecipe(recipe: Recipe, event: Event) {
    event.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete "${recipe.title}"?`)) {
      return;
    }
    
    // Add loading state
    const loadingToastId = toasts.info(`Deleting "${recipe.title}"...`, '', { duration: 0 });
    
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ id: recipe.id })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete recipe');
      }
      
      // Remove from store
      recipeStore.removeRecipe(recipe.id);
      
      // Remove loading toast and show success
      toasts.remove(loadingToastId);
      toasts.success(`Deleted "${recipe.title}" successfully!`);
      
    } catch (err) {
      console.error('Error deleting recipe:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete recipe';
      
      // Remove loading toast and show error
      toasts.remove(loadingToastId);
      toasts.error('Error', errorMessage);
    }
  }
  
  function handleSearchInput() {
    recipeStore.setSearchFilters({
      query: localSearchQuery,
      category: localSelectedCategory,
      season: localSelectedSeason
    });
  }

  function handleCategoryChange() {
    recipeStore.setSearchFilters({
      query: localSearchQuery,
      category: localSelectedCategory,
      season: localSelectedSeason
    });
  }

  function handleSeasonChange() {
    recipeStore.setSearchFilters({
      query: localSearchQuery,
      category: localSelectedCategory,
      season: localSelectedSeason
    });
  }
  
  function clearFilters() {
    recipeStore.clearSearchFilters();
    currentPage = 1;
  }
  
  function goToPage(page: number) {
    currentPage = Math.max(1, Math.min(page, totalPages));
  }
  
  function formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
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
  
  // Reset to first page when filters change
  $: if ($hasActiveSearch) {
    currentPage = 1;
  }
</script>

<section class="recipe-list">
  <div class="list-header">
    <!-- Filters and Search -->
    <div class="filters-section">
      <div class="search-box">
        <input 
          type="text" 
          bind:value={localSearchQuery}
          oninput={handleSearchInput}
          placeholder="Search recipes, ingredients, tags..."
          class="search-input"
        />
      </div>
      
      <div class="filter-controls">
        <select bind:value={localSelectedCategory} onchange={handleCategoryChange} class="filter-select">
          <option value="">All Categories</option>
          {#each categories as category}
            <option value={category}>{category}</option>
          {/each}
        </select>
        
        <select bind:value={localSelectedSeason} onchange={handleSeasonChange} class="filter-select">
          <option value="">All Seasons</option>
          {#each seasons as season}
            <option value={season}>{season}</option>
          {/each}
        </select>
        
        <select bind:value={sortBy} class="filter-select">
          <option value="created_at">Date Added</option>
          <option value="title">Title</option>
          <option value="category">Category</option>
          <option value="last_eaten">Last Eaten</option>
        </select>
        
        <button 
          class="sort-order-button" 
          onclick={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
          title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
        
        {#if $hasActiveSearch}
          <button class="clear-filters-button" onclick={clearFilters}>
            Clear Filters
          </button>
        {/if}
      </div>
    </div>
  </div>

  <div class="list-content">
    {#if error}
      <div class="error-state">
        <p>Error: {error}</p>
        <button onclick={fetchRecipes}>Try Again</button>
      </div>
    {:else if $isLoading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading recipes...</p>
      </div>
    {:else if sortedRecipes.length === 0}
      <div class="empty-state">
        <div class="empty-icon">
          {#if $hasActiveSearch}
            <Icon src={MagnifyingGlass} size="48" />
          {:else}
            <Icon src={Cake} size="48" />
          {/if}
        </div>
        <h4>
          {$hasActiveSearch ? 'No recipes found' : 'No recipes yet'}
        </h4>
        <p>
          {$hasActiveSearch 
            ? 'Try adjusting your search or filters' 
            : 'Start by asking Meal Maestro to add some recipes!'
          }
        </p>
        {#if $hasActiveSearch}
          <button class="clear-filters-button" onclick={clearFilters}>
            Clear Filters
          </button>
        {/if}
      </div>
    {:else}
      <div class="recipes-grid">
        {#each paginatedRecipes as recipe (recipe.id)}
          <div class="recipe-item" onclick={() => handleRecipeClick(recipe)} onkeydown={(e) => e.key === 'Enter' && handleRecipeClick(recipe)} role="button" tabindex="0">
            <div class="recipe-header">
              <h4 class="recipe-title">{recipe.title}</h4>
              <div class="recipe-actions">
                <button 
                  class="action-button mark-eaten" 
                  onclick={e => handleMarkEaten(recipe, e)}
                  title="Mark as eaten"
                >
                  <Icon src={CheckCircle} size="20" />
                </button>
                <button 
                  class="action-button edit" 
                  onclick={e => handleEditRecipe(recipe, e)}
                  title="Edit recipe"
                >
                  <Icon src={PencilSquare} size="20" />
                </button>
                <button 
                  class="action-button delete" 
                  onclick={e => handleDeleteRecipe(recipe, e)}
                  title="Delete recipe"
                >
                  <Icon src={Trash} size="20" />
                </button>
              </div>
            </div>
            
            <div class="recipe-meta">
              <span class="category-badge" style="background-color: {getCategoryColor(recipe.category)}">
                {recipe.category}
              </span>
              {#if recipe.season}
                <span class="season-badge"><Icon src={Cake} size="16" style="vertical-align: middle; margin-right: 2px;" /> {recipe.season}</span>
              {/if}
            </div>
            
            <div class="recipe-preview">
              <div class="ingredients-count">
                <Icon src={ClipboardDocumentList} size="16" style="vertical-align: middle; margin-right: 2px;" /> {recipe.ingredients.length} ingredients
              </div>
              {#if recipe.tags.length > 0}
                <div class="tags-preview">
                  {#each recipe.tags.slice(0, 3) as tag}
                    <span class="tag-small">{tag}</span>
                  {/each}
                  {#if recipe.tags.length > 3}
                    <span class="tag-small more">+{recipe.tags.length - 3}</span>
                  {/if}
                </div>
              {/if}
            </div>
            
            <div class="recipe-footer">
              <span class="last-eaten">
                <Icon src={CheckCircle} size="14" style="vertical-align: middle; margin-right: 2px;" /> {formatDate(recipe.last_eaten)}
              </span>
              <span class="created-date">
                Added {formatDate(recipe.created_at)}
              </span>
            </div>
          </div>
        {/each}
      </div>
      
      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="pagination">
          <button 
            class="page-button" 
            onclick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <Icon src={ArrowLeft} size="18" />
          </button>
          
          {#each Array(totalPages) as _, i}
            <button 
              class="page-button" 
              class:active={currentPage === i + 1}
              onclick={() => goToPage(i + 1)}
            >
              {i + 1}
            </button>
          {/each}
          
          <button 
            class="page-button" 
            onclick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <Icon src={ArrowRight} size="18" />
          </button>
        </div>
      {/if}
    {/if}
  </div>
</section>

<style>
  .recipe-list {
    background: transparent;
    border-radius: 0;
    border: none;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  
  .list-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  
  .filters-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    font-size: 0.95rem;
    background: var(--background);
    color: var(--text-primary);
    transition: all 0.2s ease;
    box-sizing: border-box;
  }
  
  .search-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }
  
  .filter-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  
  .filter-select {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--background);
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.2s ease;
    flex: 1;
    min-width: 120px;
  }
  
  .filter-select:focus {
    outline: none;
    border-color: var(--primary);
  }
  
  .sort-order-button {
    background: var(--background);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: 0.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: bold;
    transition: all 0.2s ease;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .sort-order-button:hover {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }
  
  .clear-filters-button {
    background: var(--error);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  
  .clear-filters-button:hover {
    background: #dc2626;
  }
  
  .list-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }
  
  .error-state, .loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
    text-align: center;
    color: var(--text-secondary);
  }
  
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border);
    border-top: 3px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
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
  
  .recipes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }
  
  .recipe-item {
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }
  
  .recipe-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -5px rgb(0 0 0 / 0.1);
    border-color: var(--primary);
  }
  
  .recipe-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }
  
  .recipe-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.3;
    flex: 1;
    margin-right: 0.5rem;
  }
  
  .recipe-actions {
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  .recipe-item:hover .recipe-actions {
    opacity: 1;
  }
  
  .action-button {
    background: none;
    border: none;
    padding: 0.25rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .action-button:hover {
    background: var(--surface);
  }
  
  .action-button.delete:hover {
    background: var(--error);
  }
  
  .recipe-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }
  
  .category-badge {
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 16px;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: capitalize;
  }
  
  .season-badge {
    background: var(--surface);
    color: var(--text-secondary);
    padding: 0.25rem 0.5rem;
    border-radius: 16px;
    font-size: 0.8rem;
    font-weight: 500;
    border: 1px solid var(--border);
  }
  
  .recipe-preview {
    margin-bottom: 0.75rem;
  }
  
  .ingredients-count {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }
  
  .tags-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  
  .tag-small {
    background: var(--primary);
    color: white;
    padding: 0.125rem 0.375rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .tag-small.more {
    background: var(--text-secondary);
  }
  
  .recipe-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
  
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }
  
  .page-button {
    background: var(--background);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    min-width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .page-button:hover:not(:disabled) {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }
  
  .page-button.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }
  
  .page-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
    .filter-controls {
      flex-direction: column;
      align-items: stretch;
    }
    
    .filter-select {
      min-width: auto;
    }
    
    .recipes-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
    
    .recipe-actions {
      opacity: 1;
    }
    
    .pagination {
      flex-wrap: wrap;
      gap: 0.25rem;
    }
  }
  
  @media (max-width: 480px) {
    .list-header {
      padding: 1rem;
    }
  
    
    .recipe-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    
    .recipe-actions {
      align-self: flex-end;
    }
  }
</style>