<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import ChatInput from '$lib/components/ChatInput.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import type { Recipe } from '$lib/types.js';
  import { isAuthenticated } from '$lib/stores/auth.js';
  import { toasts } from '$lib/stores/toastStore.js';
  import LoginButton from '$lib/components/LoginButton.svelte';

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
    <LoginButton />
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

  /* Tablet and desktop adjustments */
  @media (min-width: 768px) {
    .chat-container {
      max-height: calc(100vh - 80px);
    }
  }
</style>