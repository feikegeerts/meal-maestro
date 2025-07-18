<script lang="ts">
  import { onMount } from 'svelte';
  import type { Recipe } from '$lib/types.js';
  
  export let isProcessing = false;
  export let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  export let onNewMessage: (message: string) => void = () => {};
  export let onError: (error: string) => void = () => {};
  export let onRecipesFound: (recipes: Recipe[]) => void = () => {};

  let currentMessage = '';
  let chatContainer: HTMLDivElement;
  let messageInput: HTMLInputElement;

  // Auto-scroll to bottom when new messages are added
  $: if (conversationHistory.length > 0) {
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  async function sendMessage() {
    if (!currentMessage.trim() || isProcessing) return;

    const message = currentMessage.trim();
    currentMessage = '';

    try {
      isProcessing = true;
      
      const response = await fetch('/api/recipes/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversation_history: conversationHistory
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Update conversation history
      conversationHistory = data.conversation_history || [];
      
      // If the response contains recipe data, extract and pass to parent
      if (data.function_calls && data.function_calls.length > 0) {
        const recipes: Recipe[] = [];
        
        // Extract recipes from function call results
        for (const functionCall of data.function_calls) {
          if (functionCall.function === 'search_recipes' && functionCall.result?.recipes) {
            // Only show recipe if there's exactly one result
            if (functionCall.result.recipes.length === 1) {
              recipes.push(functionCall.result.recipes[0]);
            }
          } else if (functionCall.function === 'get_recipe_details' && functionCall.result?.recipe) {
            recipes.push(functionCall.result.recipe);
          } else if (functionCall.function === 'add_recipe' && functionCall.result?.recipe) {
            recipes.push(functionCall.result.recipe);
          } else if (functionCall.function === 'update_recipe' && functionCall.result?.recipe) {
            recipes.push(functionCall.result.recipe);
          }
        }
        
        // Pass recipes to parent component
        if (recipes.length > 0) {
          onRecipesFound(recipes);
        }
      }
      
      // Notify parent component about new message
      onNewMessage(message);
      
    } catch (error) {
      console.error('Error sending message:', error);
      onError(error instanceof Error ? error.message : 'Failed to send message');
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
      <button class="clear-button" on:click={clearConversation}>Clear Chat</button>
    {/if}
  </div>

  <!-- Conversation Display -->
  <div class="conversation" bind:this={chatContainer}>
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
        on:keypress={handleKeyPress}
        placeholder="Type your message about recipes..."
        disabled={isProcessing}
        class="message-input"
      />
      <button
        class="send-button"
        on:click={sendMessage}
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