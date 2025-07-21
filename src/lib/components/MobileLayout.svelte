<script lang="ts">
  import TopNav from './TopNav.svelte';
  
  export let showHeader: boolean = true;
</script>

<div class="mobile-layout">
  <!-- Top navigation - always visible and sticky -->
  {#if showHeader}
    <TopNav />
  {/if}
  
  <main class="main-content" class:with-header={showHeader}>
    <div class="content-container">
      <slot />
    </div>
  </main>
</div>

<style>
  .mobile-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--background, #ffffff);
  }
  
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .main-content.with-header {
    /* Add top padding to account for sticky top nav */
    padding-top: 0; /* Top nav handles its own spacing */
  }
  
  .content-container {
    flex: 1;
    padding: 16px;
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