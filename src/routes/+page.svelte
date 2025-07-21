<script lang="ts">
  import { onMount } from 'svelte';
  import ChatInput from '$lib/components/ChatInput.svelte';
  import RecipeDisplay from '$lib/components/RecipeDisplay.svelte';
  import RecipeList from '$lib/components/RecipeList.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import type { Recipe } from '$lib/types.js';
  import { recipeStore } from '$lib/stores/recipeStore.js';
  import { toasts } from '$lib/stores/toastStore.js';
  import { isAuthenticated } from '$lib/stores/auth.js';
  import LoginForm from '$lib/components/LoginForm.svelte';
  
  let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let isProcessing = false;
  let error = '';
  let actionLogs: any[] = [];
  let displayedRecipe: Recipe | null = null;
  let recipeDisplayTitle = 'Recipe';
  
  // Tab management
  type TabType = 'browse' | 'details' | 'history';
  let activeTab: TabType = 'browse';
  let hasDisplayedRecipe = false;

  function handleNewMessage(message: string) {
    // Message handling is done in ChatInput component
    // This is just for any additional logic needed
  }
  
  // Function to programmatically trigger chat message processing
  async function triggerChatMessage(message: string) {
    if (!message.trim() || isProcessing) return;
    
    try {
      isProcessing = true;
      
      const response = await fetch('/api/recipes/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          message: message.trim(),
          conversation_history: conversationHistory
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }
      
      // Update conversation history with response
      conversationHistory = data.conversation_history || [];
      
      // Handle any recipe updates from the response
      if (data.function_calls && data.function_calls.length > 0) {
        for (const functionCall of data.function_calls) {
          if (functionCall.function === 'update_recipe' && functionCall.result?.recipe) {
            const updatedRecipe = functionCall.result.recipe;
            
            // Update displayed recipe
            displayedRecipe = updatedRecipe;
            recipeDisplayTitle = `Updated: ${updatedRecipe.title}`;
            
            // Update shared state
            recipeStore.updateRecipe(updatedRecipe);
            toasts.success(`Updated "${updatedRecipe.title}"`);
          }
        }
      }
      
    } catch (error) {
      console.error('Error processing edit request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process edit request';
      handleError(errorMessage);
      toasts.error('Edit Error', errorMessage);
    } finally {
      isProcessing = false;
    }
  }
  
  function handleRecipesFound(recipes: Recipe[]) {
    // Only display the first recipe if multiple are found
    // The AI should handle asking clarifying questions for multiple results
    if (recipes.length > 0) {
      displayedRecipe = recipes[0];
      recipeDisplayTitle = 'Recipe';
      hasDisplayedRecipe = true;
      // Auto-switch to details tab when a recipe is found
      activeTab = 'details';
    } else {
      displayedRecipe = null;
      recipeDisplayTitle = 'Recipe';
      hasDisplayedRecipe = false;
    }
  }
  
  function handleRecipeUpdated(updatedRecipe: Recipe) {
    // If the updated recipe is currently displayed, update it
    if (displayedRecipe && displayedRecipe.id === updatedRecipe.id) {
      displayedRecipe = updatedRecipe;
      recipeDisplayTitle = `Updated: ${updatedRecipe.title}`;
    }
  }

  function handleSearchResults(recipes: Recipe[], searchQuery: string) {
    // When multiple search results are found, show them in browse tab
    if (recipes.length > 1) {
      // Auto-switch to browse tab to show filtered results
      activeTab = 'browse';
      
      // Show toast with summary
      toasts.info(`Found ${recipes.length} recipes`, `Click "Browse" tab to see all results`);
    } else if (recipes.length === 1) {
      // Single result - show in details tab
      handleRecipesFound(recipes);
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

  function handleRecipeSelected(recipe: Recipe) {
    // Display the recipe in details tab
    displayedRecipe = recipe;
    recipeDisplayTitle = recipe.title;
    hasDisplayedRecipe = true;
    activeTab = 'details';
  }

  // Remove handleMarkEaten - now handled directly in RecipeList

  function handleEditRecipe(recipe: Recipe) {
    // Switch to details tab to show current recipe
    displayedRecipe = recipe;
    recipeDisplayTitle = `Edit: ${recipe.title}`;
    hasDisplayedRecipe = true;
    activeTab = 'details';
    
    // Show a toast to guide the user on how to proceed
    toasts.info(
      'Recipe Ready to Edit', 
      `"${recipe.title}" is now displayed. Use the chat below to specify what you'd like to edit (e.g., "add more garlic", "change cooking time", etc.)`
    );
  }

  // Remove handleDeleteRecipe - now handled directly in RecipeList

  function switchTab(tab: TabType) {
    activeTab = tab;
  }
  
  function handleAuthSuccess() {
    toasts.success('Welcome!', 'You can now start managing your recipes.');
  }
  
  function handleAuthError(event: CustomEvent<{ message: string }>) {
    toasts.error('Sign In Error', event.detail.message);
  }
  
  // Check for auth errors in URL params
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authError = urlParams.get('auth_error');
    if (authError) {
      let errorMessage = 'Authentication failed';
      switch (authError) {
        case 'callback_failed':
          errorMessage = 'Authentication callback failed. Please try again.';
          break;
        case 'no_code':
          errorMessage = 'No authorization code received from Google.';
          break;
        case 'true':
          errorMessage = 'Authentication process failed. Please check your configuration.';
          break;
        case 'no_session':
          errorMessage = 'Authentication completed but no session was created.';
          break;
        default:
          errorMessage = `Authentication error: ${authError}`;
      }
      toasts.error('Authentication Failed', errorMessage);
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  });
</script>

<svelte:head>
  <title>Meal Maestro</title>
</svelte:head>

<main>
  <PageHeader 
    title="Meal Maestro" 
    subtitle="Your AI-powered recipe assistant" 
  />

  {#if error}
    <div class="error-banner">
      <span class="error-icon">⚠️</span>
      <span class="error-message">{error}</span>
      <button class="error-close" onclick={() => error = ''}>×</button>
    </div>
  {/if}

  {#if $isAuthenticated}
    <div class="container">
    <div class="chat-section">
      <ChatInput 
        bind:conversationHistory
        bind:isProcessing
        onNewMessage={handleNewMessage}
        onError={handleError}
        onRecipesFound={handleRecipesFound}
        onSearchResults={handleSearchResults}
        onRecipeUpdated={handleRecipeUpdated}
        currentTab={activeTab}
        selectedRecipe={displayedRecipe}
      />
    </div>
    
    <div class="right-panel">
      <!-- Tab Navigation -->
      <div class="tab-nav">
        <button 
          class="tab-button" 
          class:active={activeTab === 'browse'}
          onclick={() => switchTab('browse')}
        >
          <span class="tab-icon">🍽️</span>
          <span class="tab-label">Browse</span>
        </button>
        
        <button 
          class="tab-button" 
          class:active={activeTab === 'details'}
          class:has-content={hasDisplayedRecipe}
          onclick={() => switchTab('details')}
        >
          <span class="tab-icon">📄</span>
          <span class="tab-label">Details</span>
        </button>
      </div>
      
      <!-- Tab Content -->
      <div class="tab-content">
        {#if activeTab === 'browse'}
          <RecipeList 
            onRecipeSelected={handleRecipeSelected}
            onEditRecipe={handleEditRecipe}
          />
        {:else if activeTab === 'details'}
          <RecipeDisplay 
            bind:recipe={displayedRecipe}
            isLoading={isProcessing}
            title={recipeDisplayTitle}
          />
        {/if}
      </div>
    </div>
    </div>
  {:else}
    <!-- User not authenticated - show login form -->
    <div class="auth-section">
      <LoginForm 
        on:success={handleAuthSuccess}
        on:error={handleAuthError}
      />
    </div>
  {/if}
</main>

<!-- Toast Container -->
<ToastContainer />

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

  .auth-section {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    margin-top: 2rem;
  }

  .container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    align-items: start;
  }
  
  .chat-section {
    min-height: 600px;
  }
  
  .right-panel {
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-radius: 16px;
    border: 1px solid var(--border);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    overflow: hidden;
    min-height: 600px;
  }
  
  .tab-nav {
    display: flex;
    background: var(--background);
    border-bottom: 1px solid var(--border);
  }
  
  .tab-button {
    flex: 1;
    background: none;
    border: none;
    padding: 1rem 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-weight: 500;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    position: relative;
    min-height: 56px;
  }
  
  .tab-button:hover {
    color: var(--text-primary);
    background: var(--surface);
  }
  
  .tab-button.active {
    color: var(--primary);
    background: var(--surface);
    border-bottom: 2px solid var(--primary);
  }
  
  .tab-button.has-content {
    color: var(--text-primary);
  }
  
  .tab-icon {
    font-size: 1.1rem;
  }
  
  .tab-label {
    font-weight: 500;
  }
  
  .tab-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .tab-content > :global(*) {
    height: 100%;
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

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(1.2);
    }
  }

  /* Mobile Responsiveness */
  @media (max-width: 768px) {
    .container {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    
    .chat-section {
      min-height: 500px;
    }
    
    .right-panel {
      min-height: 500px;
    }
    
    .tab-button {
      padding: 0.75rem 0.5rem;
      font-size: 0.8rem;
      gap: 0.25rem;
      min-height: 48px;
    }
    
    .tab-icon {
      font-size: 1rem;
    }
    
    .tab-label {
      font-size: 0.8rem;
    }
  }

  @media (max-width: 480px) {
    main {
      padding: 0.5rem;
    }
    
    .container {
      gap: 1rem;
    }
    
    .tab-button {
      padding: 0.5rem 0.25rem;
      gap: 0.125rem;
      flex-direction: column;
      min-height: 52px;
    }
    
    .tab-label {
      font-size: 0.75rem;
    }
    
    .tab-icon {
      font-size: 0.9rem;
    }
  }
</style>
