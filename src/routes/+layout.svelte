<script>
    import '../app.css'; 
    import { onMount } from 'svelte';
    import { authStore, isInitialized } from '$lib/stores/auth.js';
    import TopNav from '$lib/components/TopNav.svelte';
    
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
  <TopNav />
  <main class="main-content">
    <div class="content-container">
      <slot />
    </div>
  </main>
{:else}
  <div class="loading-screen">
    <div class="loading-spinner"></div>
    <p>Initializing...</p>
  </div>
{/if}

<style>
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding-top: 0; 
  }
  
  .content-container {
    flex: 1;
    padding: 16px;
  }

  .loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--background);
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
    border: 3px solid var(--border);
    border-top: 3px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-screen p {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Adjust content padding on different screen sizes */
  @media (min-width: 768px) {
    .content-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }
  }
  
  @media (min-width: 1024px) {
    .content-container {
      padding: 32px;
    }
  }
  
</style>
