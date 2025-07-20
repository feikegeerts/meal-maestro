<script lang="ts">
  import { toasts } from '$lib/stores/toastStore.js';
  import Toast from './Toast.svelte';
  
  $: activeToasts = $toasts;
</script>

<div class="toast-container" class:has-toasts={activeToasts.length > 0}>
  {#each activeToasts as toast (toast.id)}
    <Toast
      id={toast.id}
      type={toast.type}
      title={toast.title}
      message={toast.message}
      duration={toast.duration}
      dismissible={toast.dismissible}
      onClose={toasts.remove}
    />
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    pointer-events: none;
    max-width: 400px;
    width: 100%;
  }
  
  .toast-container.has-toasts {
    pointer-events: auto;
  }
  
  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .toast-container {
      top: 0.5rem;
      right: 0.5rem;
      left: 0.5rem;
      max-width: none;
    }
  }
  
  @media (max-width: 480px) {
    .toast-container {
      top: 0.25rem;
      right: 0.25rem;
      left: 0.25rem;
    }
  }
</style>