<script lang="ts">
  import { page } from '$app/stores';
  import MobileBottomNav from './MobileBottomNav.svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import { onMount } from 'svelte';
  
  export let title: string = 'Meal Maestro';
  export let showHeader: boolean = true;
  export let showBottomNav: boolean = true;
  export let headerActions: any[] = [];
  
  let isMobile = false;
  let screenWidth = 0;
  
  onMount(() => {
    function updateScreenSize() {
      screenWidth = window.innerWidth;
      isMobile = screenWidth < 768;
    }
    
    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    
    return () => {
      window.removeEventListener('resize', updateScreenSize);
    };
  });
  
  $: currentPath = $page.url.pathname;
  $: pageTitle = getPageTitle(currentPath);
  
  function getPageTitle(path: string): string {
    switch (path) {
      case '/':
        return 'My Recipes';
      case '/chat':
        return 'Recipe Chat';
      case '/settings':
        return 'Settings';
      default:
        if (path.startsWith('/recipes/')) {
          return 'Recipe Details';
        }
        return title;
    }
  }
</script>

<div class="mobile-layout" class:has-bottom-nav={showBottomNav && isMobile}>
  
  <main class="main-content" class:with-header={showHeader}>
    <div class="content-container">
      <slot />
    </div>
  </main>
  
  {#if showBottomNav && isMobile}
    <MobileBottomNav />
  {/if}
  
  {#if isMobile}
    <div class="mobile-theme-toggle">
      <ThemeToggle />
    </div>
  {/if}
</div>

<style>
  .mobile-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--background, #ffffff);
  }
  
  .mobile-layout.has-bottom-nav {
    padding-bottom: calc(70px + env(safe-area-inset-bottom, 0));
  }
</style>