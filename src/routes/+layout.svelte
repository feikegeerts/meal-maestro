<script>
    import '../app.css'; 
    import { onMount } from 'svelte';
    import ThemeToggle from '$lib/components/ThemeToggle.svelte';
    import { authStore, isInitialized } from '$lib/stores/auth.js';
    
    let currentTheme = 'light';
    
    onMount(() => {
      const savedTheme = localStorage.getItem('theme');
      
      if (savedTheme) {
        currentTheme = savedTheme;
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        currentTheme = 'dark';
      }
      
      document.documentElement.setAttribute('data-theme', currentTheme);
      
      // Initialize authentication
      authStore.initialize();
    });
</script>
  
{#if $isInitialized}
  <slot />
{:else}
  <div class="loading-screen">
    <div class="loading-spinner"></div>
    <p>Initializing...</p>
  </div>
{/if}

<ThemeToggle bind:theme={currentTheme} />

<style>
  .loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--background, #ffffff);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    z-index: 1000;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border, #e5e7eb);
    border-top: 3px solid var(--primary, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-screen p {
    color: var(--text-secondary, #6b7280);
    font-size: 0.9rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
