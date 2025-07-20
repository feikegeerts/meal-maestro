<script lang="ts">
  import { onMount } from 'svelte';
  import type { Recipe } from '$lib/types.js';
  import { recipeStore } from '$lib/stores/recipeStore.js';
  import { toasts } from '$lib/stores/toastStore.js';
  
  export let isProcessing = false;
  export let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  export let onNewMessage: (message: string) => void = () => {};
  export let onError: (error: string) => void = () => {};
  export let onRecipesFound: (recipes: Recipe[]) => void = () => {};
  export let onSearchResults: (recipes: Recipe[], searchQuery: string) => void = () => {};
  export let onRecipeUpdated: (recipe: Recipe) => void = () => {};
  
  // Context props for LLM awareness
  export let currentTab: string = 'browse';
  export let selectedRecipe: Recipe | null = null;

  let currentMessage = '';
  let chatContainer: HTMLDivElement;
  let messageInput: HTMLInputElement;

  let shouldAutoScroll = true;
  let previousHistoryLength = 0;

  // Check if user is near bottom before auto-scrolling
  function checkScrollPosition() {
    if (!chatContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainer;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;
    shouldAutoScroll = isNearBottom;
  }

  // Auto-scroll to bottom only when new messages are added and user is near bottom
  $: if (conversationHistory.length > previousHistoryLength && shouldAutoScroll) {
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
    previousHistoryLength = conversationHistory.length;
  } else if (conversationHistory.length !== previousHistoryLength) {
    previousHistoryLength = conversationHistory.length;
  }

  async function sendMessage() {
    if (!currentMessage.trim() || isProcessing) return;

    const message = currentMessage.trim();
    currentMessage = '';

    try {
      isProcessing = true;
      
      // Prepare context information for the LLM
      const contextInfo: any = {
        current_tab: currentTab
      };
      
      // Include selected recipe context if recipe is displayed in details tab
      if (currentTab === 'details' && selectedRecipe) {
        contextInfo.selected_recipe = {
          id: selectedRecipe.id,
          title: selectedRecipe.title,
          category: selectedRecipe.category,
          season: selectedRecipe.season,
          tags: selectedRecipe.tags,
          ingredients: selectedRecipe.ingredients,
          description: selectedRecipe.description
        };
      }

      const response = await fetch('/api/recipes/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          message,
          conversation_history: conversationHistory,
          context: contextInfo
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Update conversation history
      conversationHistory = data.conversation_history || [];
      
      // Handle function calls and update shared state
      if (data.function_calls && data.function_calls.length > 0) {
        const foundRecipes: Recipe[] = [];
        let searchQuery = '';
        
        // Extract recipes from function call results
        for (const functionCall of data.function_calls) {
          // Process function call
          if (functionCall.function === 'search_recipes' && functionCall.result?.recipes) {
            const searchResults = functionCall.result.recipes;
            foundRecipes.push(...searchResults);
            
            // Extract search query from function arguments
            if (functionCall.arguments?.query) {
              searchQuery = functionCall.arguments.query;
            }
            
            // Update shared state with search results
            if (searchResults.length > 0) {
              // Set search filters in store to show filtered results
              const filters: any = {};
              if (functionCall.arguments?.query) filters.query = functionCall.arguments.query;
              if (functionCall.arguments?.category) filters.category = functionCall.arguments.category;
              if (functionCall.arguments?.season) filters.season = functionCall.arguments.season;
              if (functionCall.arguments?.tags) filters.tags = functionCall.arguments.tags;
              
              // Infer filters from search results and message  
              const inferredFilters = inferFiltersFromResults(searchResults, message);
              
              if (Object.keys(inferredFilters).length > 0) {
                recipeStore.setSearchFilters(inferredFilters);
              }
              
              // Notify parent about search results
              onSearchResults(searchResults, searchQuery);
              
              // Show toast with search summary
              if (searchResults.length === 1) {
                toasts.info(`Found 1 recipe: "${searchResults[0].title}"`);
              } else {
                toasts.info(`Found ${searchResults.length} recipes${searchQuery ? ` for "${searchQuery}"` : ''}`);
              }
            } else {
              toasts.warning('No recipes found', 'Try adjusting your search criteria');
            }
          } else if (functionCall.function === 'get_recipe_details' && functionCall.result?.recipe) {
            foundRecipes.push(functionCall.result.recipe);
          } else if (functionCall.function === 'add_recipe' && functionCall.result?.recipe) {
            const newRecipe = functionCall.result.recipe;
            foundRecipes.push(newRecipe);
            
            // Add to shared state
            recipeStore.addRecipe(newRecipe);
            toasts.success(`Added "${newRecipe.title}" to your recipes!`);
          } else if (functionCall.function === 'update_recipe' && functionCall.result?.recipe) {
            const updatedRecipe = functionCall.result.recipe;
            foundRecipes.push(updatedRecipe);
            
            // Update shared state
            recipeStore.updateRecipe(updatedRecipe);
            toasts.success(`Updated "${updatedRecipe.title}"`);
            
            // Notify parent component about the recipe update
            onRecipeUpdated(updatedRecipe);
          } else if (functionCall.function === 'delete_recipe' && functionCall.result?.success) {
            // Handle deletion in shared state
            if (functionCall.arguments?.id) {
              recipeStore.removeRecipe(functionCall.arguments.id);
              toasts.success('Recipe deleted successfully');
            }
          } else if (functionCall.function === 'mark_recipe_eaten' && functionCall.result?.recipe) {
            const updatedRecipe = functionCall.result.recipe;
            
            // Update shared state
            recipeStore.updateRecipe(updatedRecipe);
            toasts.success(`Marked "${updatedRecipe.title}" as eaten!`);
          }
        }
        
        // Pass recipes to parent component for single recipe display
        if (foundRecipes.length === 1) {
          onRecipesFound(foundRecipes);
        }
      }
      
      // Notify parent component about new message
      onNewMessage(message);
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      onError(errorMessage);
      toasts.error('Chat Error', errorMessage);
    } finally {
      isProcessing = false;
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function clearConversation() {
    conversationHistory = [];
  }

  // Function to infer filters from search results and user message
  function inferFiltersFromResults(results: Recipe[], userMessage: string): any {
    const filters: any = {};
    
    if (results.length === 0) return filters;
    
    const message = userMessage.toLowerCase();
    
    // Check if all results have the same category
    const categories = [...new Set(results.map(r => r.category))];
    if (categories.length === 1) {
      // If the user mentioned that category in their message, use it as a filter
      const category = categories[0].toLowerCase();
      if (message.includes(category) || 
          message.includes('dinner') && category === 'dinner' ||
          message.includes('breakfast') && category === 'breakfast' ||
          message.includes('lunch') && category === 'lunch' ||
          message.includes('dessert') && category === 'dessert' ||
          message.includes('snack') && category === 'snack') {
        filters.category = categories[0];
      }
    }
    
    // Check if all results have the same season
    const seasons = [...new Set(results.map(r => r.season).filter(Boolean))];
    if (seasons.length === 1 && seasons[0]) {
      const season = seasons[0].toLowerCase();
      if (message.includes(season) || 
          message.includes('spring') && season === 'spring' ||
          message.includes('summer') && season === 'summer' ||
          message.includes('fall') && season === 'fall' ||
          message.includes('winter') && season === 'winter') {
        filters.season = seasons[0];
      }
    }
    
    // Check for common search terms that might be queries
    if (message.includes('chocolate') || message.includes('pasta') || message.includes('chicken')) {
      const terms = message.split(' ');
      const foodTerms = terms.filter(term => 
        ['chocolate', 'pasta', 'chicken', 'beef', 'fish', 'vegetarian', 'vegan'].includes(term)
      );
      if (foodTerms.length > 0) {
        filters.query = foodTerms[0];
      }
    }
    
    return filters;
  }

  // Focus input on mount
  onMount(() => {
    if (messageInput) {
      messageInput.focus();
    }
  });
</script>

<section class="chat-section">
  <div class="chat-header">
    <h3>Chat with Meal Maestro</h3>
    {#if conversationHistory.length > 0}
      <button class="clear-button" onclick={clearConversation}>Clear Chat</button>
    {/if}
  </div>

  <!-- Conversation Display -->
  <div class="conversation" bind:this={chatContainer} onscroll={checkScrollPosition}>
    {#if conversationHistory.length === 0}
      <div class="welcome-message">
        <div class="welcome-icon">🍽️</div>
        <h4>Welcome to Meal Maestro!</h4>
        <p>I'm your AI-powered recipe assistant. Ask me to:</p>
        <ul>
          <li>Add new recipes to your collection</li>
          <li>Search for existing recipes</li>
          <li>Update recipe details</li>
          <li>Mark recipes as eaten</li>
          <li>Get recipe recommendations</li>
        </ul>
        <p class="example">Try: "Add a recipe for chocolate pancakes" or "Show me my dinner recipes"</p>
      </div>
    {:else}
      {#each conversationHistory as message}
        <div class="message {message.role}-message">
          <div class="message-header">
            <span class="message-label">
              {message.role === 'user' ? 'You' : 'Meal Maestro'}
            </span>
          </div>
          <div class="message-content">
            {message.content}
          </div>
        </div>
      {/each}
    {/if}
    
    {#if isProcessing}
      <div class="message assistant-message processing">
        <div class="message-header">
          <span class="message-label">Meal Maestro</span>
        </div>
        <div class="message-content">
          <div class="typing-indicator">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Message Input -->
  <div class="input-section">
    <div class="input-container">
      <input
        bind:this={messageInput}
        bind:value={currentMessage}
        onkeypress={handleKeyPress}
        placeholder="Type your message about recipes..."
        disabled={isProcessing}
        class="message-input"
      />
      <button
        class="send-button"
        onclick={sendMessage}
        disabled={isProcessing || !currentMessage.trim()}
      >
        {#if isProcessing}
          <div class="spinner"></div>
        {:else}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13"></path>
            <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
          </svg>
        {/if}
      </button>
    </div>
  </div>
</section>

<style>
  .chat-section {
    background: var(--surface);
    border-radius: 16px;
    border: 1px solid var(--border);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    display: flex;
    flex-direction: column;
    height: 600px;
    overflow: hidden;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  .chat-header h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.2rem;
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
    background: #dc2626;
    transform: translateY(-1px);
  }

  .conversation {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .welcome-message {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
  }

  .welcome-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .welcome-message h4 {
    color: var(--text-primary);
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
  }

  .welcome-message p {
    margin: 0 0 1rem 0;
    line-height: 1.6;
  }

  .welcome-message ul {
    text-align: left;
    max-width: 400px;
    margin: 0 auto 1rem;
  }

  .welcome-message li {
    margin: 0.5rem 0;
  }

  .example {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    font-style: italic;
    color: var(--text-secondary);
  }

  .message {
    padding: 1rem;
    border-radius: 12px;
    max-width: 80%;
    animation: slideIn 0.3s ease-out;
  }

  .user-message {
    background: var(--primary);
    color: white;
    align-self: flex-end;
    margin-left: auto;
  }

  .assistant-message {
    background: var(--background);
    border: 1px solid var(--border);
    align-self: flex-start;
    margin-right: auto;
  }

  .assistant-message.processing {
    opacity: 0.7;
  }

  .message-header {
    margin-bottom: 0.5rem;
  }

  .message-label {
    font-size: 0.875rem;
    font-weight: 600;
    opacity: 0.8;
  }

  .message-content {
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .typing-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-secondary);
    animation: typing 1.4s infinite ease-in-out;
  }

  .dot:nth-child(1) { animation-delay: 0s; }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }

  .input-section {
    padding: 1rem;
    border-top: 1px solid var(--border);
    background: var(--surface);
  }

  .input-container {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .message-input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    border-radius: 24px;
    font-size: 1rem;
    background: var(--background);
    color: var(--text-primary);
    transition: all 0.2s ease;
  }

  .message-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }

  .message-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .send-button {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: var(--primary);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .send-button:hover:not(:disabled) {
    background: var(--primary-dark);
    transform: translateY(-1px);
  }

  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  /* Animations */
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

  @keyframes typing {
    0%, 60%, 100% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-10px);
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Mobile Responsiveness */
  @media (max-width: 768px) {
    .chat-section {
      height: 500px;
    }
    
    .message {
      max-width: 90%;
    }
    
    .input-section {
      padding: 0.75rem;
    }
  }

  @media (max-width: 480px) {
    .chat-header {
      padding: 1rem;
    }
    
    .conversation {
      padding: 0.75rem;
    }
    
    .welcome-message {
      padding: 1rem;
    }
    
    .welcome-icon {
      font-size: 2rem;
    }
  }
</style>