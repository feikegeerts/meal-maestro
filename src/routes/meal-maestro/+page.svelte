<script lang="ts">
  import { onMount } from 'svelte';
  import ChatInput from '$lib/components/ChatInput.svelte';
  import ActionLogs from '$lib/components/ActionLogs.svelte';
  import RecipeDisplay from '$lib/components/RecipeDisplay.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import type { Recipe } from '$lib/types.js';
  
  let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let isProcessing = false;
  let error = '';
  let actionLogs: any[] = [];
  let displayedRecipe: Recipe | null = null;
  let recipeDisplayTitle = 'Recipe';

  function handleNewMessage(message: string) {
    // Message handling is done in ChatInput component
    // This is just for any additional logic needed
  }
  
  function handleRecipesFound(recipes: Recipe[]) {
    // Only display the first recipe if multiple are found
    // The AI should handle asking clarifying questions for multiple results
    if (recipes.length > 0) {
      displayedRecipe = recipes[0];
      recipeDisplayTitle = 'Recipe';
    } else {
      displayedRecipe = null;
      recipeDisplayTitle = 'Recipe';
    }
  }

  function handleError(errorMessage: string) {
    error = errorMessage;
    // Clear error after 5 seconds
    setTimeout(() => {
      error = '';
    }, 5000);
  }

  function clearLogs() {
    // This would typically make an API call to clear logs
    // For now, we'll just refresh the ActionLogs component
    actionLogs = [];
  }
</script>

<main>
  <PageHeader 
    title="Meal Maestro" 
    subtitle="Your AI-powered recipe assistant" 
  />

  {#if error}
    <div class="error-banner">
      <span class="error-icon">⚠️</span>
      <span class="error-message">{error}</span>
      <button class="error-close" on:click={() => error = ''}>×</button>
    </div>
  {/if}

  <div class="container">
    <div class="chat-section">
      <ChatInput 
        bind:conversationHistory
        bind:isProcessing
        onNewMessage={handleNewMessage}
        onError={handleError}
        onRecipesFound={handleRecipesFound}
      />
    </div>
    
    <div class="recipe-section">
      <RecipeDisplay 
        bind:recipe={displayedRecipe}
        isLoading={isProcessing}
        title={recipeDisplayTitle}
      />
    </div>
    
    <div class="logs-section">
      <ActionLogs 
        bind:actionLogs
        on:clearLogs={clearLogs}
      />
    </div>
  </div>
</main>

<style>
  main {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    min-height: 100vh;
  }

  .error-banner {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    animation: slideDown 0.3s ease-out;
  }

  .error-icon {
    font-size: 1.25rem;
    color: #dc2626;
  }

  .error-message {
    flex: 1;
    color: #dc2626;
    font-weight: 500;
  }

  .error-close {
    background: none;
    border: none;
    color: #dc2626;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .error-close:hover {
    background: #fca5a5;
  }

  .container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 2rem;
    align-items: start;
  }
  
  .chat-section {
    grid-column: 1;
    grid-row: 1;
  }
  
  .recipe-section {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
  
  .logs-section {
    grid-column: 1;
    grid-row: 2;
  }

  /* Animations */
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Mobile Responsiveness */
  @media (max-width: 768px) {
    .container {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto auto;
      gap: 1.5rem;
    }
    
    .chat-section {
      grid-column: 1;
      grid-row: 1;
    }
    
    .recipe-section {
      grid-column: 1;
      grid-row: 2;
    }
    
    .logs-section {
      grid-column: 1;
      grid-row: 3;
    }
  }

  @media (max-width: 480px) {
    main {
      padding: 0.5rem;
    }
  }
</style>
