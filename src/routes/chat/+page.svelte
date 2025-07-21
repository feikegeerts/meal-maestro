<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import ChatInput from '$lib/components/ChatInput.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import type { Recipe } from '$lib/types.js';
  import { isAuthenticated } from '$lib/stores/auth.js';
  import { toasts } from '$lib/stores/toastStore.js';
  import LoginForm from '$lib/components/LoginForm.svelte';

  let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let isProcessing = false;
  let initialPrompt: string = '';

  // Get initial prompt from URL params
  onMount(() => {
    const urlParams = new URLSearchParams($page.url.search);
    const prompt = urlParams.get('prompt');
    if (prompt) {
      initialPrompt = prompt;
      // Clear the URL parameter
      window.history.replaceState({}, '', '/chat');
    }
  });

  function handleNewMessage(message: string) {
    // Message handling is done in ChatInput component
  }

  function handleRecipesFound(recipes: Recipe[]) {
    if (recipes.length > 0) {
      toasts.success(`Found ${recipes.length} recipe${recipes.length > 1 ? 's' : ''}!`);
    }
  }

  function handleSearchResults(recipes: Recipe[], searchQuery: string) {
    if (recipes.length > 0) {
      toasts.info(`Found ${recipes.length} recipes`, `Matching "${searchQuery}"`);
    }
  }

  function handleRecipeUpdated(updatedRecipe: Recipe) {
    toasts.success(`Updated "${updatedRecipe.title}"`);
  }

  function handleError(errorMessage: string) {
    toasts.error('Chat Error', errorMessage);
  }

  function handleAuthSuccess() {
    toasts.success('Welcome!', 'You can now start chatting with your recipe assistant.');
  }

  function handleAuthError(event: CustomEvent<{ message: string }>) {
    toasts.error('Sign In Error', event.detail.message);
  }
</script>

<svelte:head>
  <title>Chat - Meal Maestro</title>
</svelte:head>

<main class="chat-page">
  {#if $isAuthenticated}
    <div class="chat-container">
      <div class="chat-content">
        <ChatInput
          bind:conversationHistory
          bind:isProcessing
          onNewMessage={handleNewMessage}
          onError={handleError}
          onRecipesFound={handleRecipesFound}
          onSearchResults={handleSearchResults}
          onRecipeUpdated={handleRecipeUpdated}
          currentTab="chat"
          selectedRecipe={null}
          messageInputValue={initialPrompt}
        />
      </div>
    </div>
  {:else}
    <div class="auth-section">
      <div class="auth-card">
        <h1 class="auth-title">Sign In Required</h1>
        <p class="auth-subtitle">Please sign in to start chatting with your recipe assistant</p>
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
  .chat-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--background, #f8fafc);
  }

  .chat-container {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    max-height: calc(100vh - 90px);
  }

  .chat-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

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
    .chat-page {
      background: var(--background, #0f172a);
    }
  }

  /* Tablet and desktop adjustments */
  @media (min-width: 768px) {
    .chat-container {
      max-height: calc(100vh - 80px);
    }
  }
</style>