<script lang="ts">
  import { onMount } from 'svelte';
  
  export let id: string;
  export let type: 'success' | 'error' | 'info' | 'warning' = 'info';
  export let title: string;
  export let message: string = '';
  export let duration: number = 4000; // Auto-dismiss after 5 seconds
  export let dismissible: boolean = true;
  export let onClose: ((id: string) => void) | undefined = undefined;
  
  let visible = false;
  let timeoutId: NodeJS.Timeout | null = null;
  
  // Animation lifecycle
  onMount(() => {
    // Trigger entrance animation
    setTimeout(() => {
      visible = true;
    }, 10);
    
    // Auto-dismiss if duration is set
    if (duration > 0) {
      timeoutId = setTimeout(() => {
        handleClose();
      }, duration);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  });
  
  function handleClose() {
    visible = false;
    // Wait for exit animation before calling onClose
    setTimeout(() => {
      onClose?.(id);
    }, 300);
  }
  
  function pauseTimer() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }
  
  function resumeTimer() {
    if (duration > 0 && !timeoutId) {
      timeoutId = setTimeout(() => {
        handleClose();
      }, duration);
    }
  }
  
  import Icon from '@iconify/svelte';

  // Icon mapping using Lucide
  const icons = {
    success: 'lucide:check-circle',
    error: 'lucide:x-circle',
    warning: 'lucide:alert-triangle',
    info: 'lucide:info'
  };
</script>

<div 
  class="toast toast-{type}"
  class:visible
  onmouseenter={pauseTimer}
  onmouseleave={resumeTimer}
  role="status"
  aria-live="polite"
>
  <div class="toast-content">
    <div class="toast-icon">
      <Icon icon={icons[type]} width="1.5em" height="1.5em" />
    </div>
    
    <div class="toast-text">
      <div class="toast-title">{title}</div>
      {#if message}
        <div class="toast-message">{message}</div>
      {/if}
    </div>
    
    {#if dismissible}
      <button class="toast-close" onclick={handleClose} aria-label="Close notification">
        ×
      </button>
    {/if}
  </div>
  
  {#if duration > 0}
    <div class="toast-progress" class:paused={!timeoutId}></div>
  {/if}
</div>

<style>
  .toast {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
    margin-bottom: 1rem;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: auto;
    max-width: 400px;
    width: 100%;
  }
  
  .toast.visible {
    opacity: 1;
    transform: translateX(0);
  }
  
  .toast-success {
    border-left: 4px solid var(--success);
  }
  
  .toast-error {
    border-left: 4px solid var(--error);
  }
  
  .toast-warning {
    border-left: 4px solid var(--warning);
  }
  
  .toast-info {
    border-left: 4px solid var(--primary);
  }
  
  .toast-content {
    display: flex;
    align-items: flex-start;
    padding: 1rem;
    gap: 0.75rem;
  }
  
  .toast-icon {
    font-size: 1rem;
    flex-shrink: 0;
    margin-top: 0.125rem;
  }
  
  .toast-text {
    flex: 1;
    min-width: 0;
  }
  
  .toast-title {
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
    margin-bottom: 0.25rem;
  }
  
  .toast-message {
    color: var(--text-secondary);
    font-size: 0.75rem;
    line-height: 1.4;
    word-wrap: break-word;
  }
  
  .toast-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1rem;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
    flex-shrink: 0;
    margin-top: -0.25rem;
  }
  
  .toast-close:hover {
    color: var(--text-primary);
    background: var(--background);
  }
  
  .toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    border-radius: 0 0 12px 12px;
    animation: progress 5s linear forwards;
  }
  
  .toast-success .toast-progress {
    background: var(--success);
  }
  
  .toast-error .toast-progress {
    background: var(--error);
  }
  
  .toast-warning .toast-progress {
    background: var(--warning);
  }
  
  .toast-info .toast-progress {
    background: var(--primary);
  }
  
  .toast-progress.paused {
    animation-play-state: paused;
  }
  
  @keyframes progress {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
  
  /* Mobile responsiveness */
  @media (max-width: 480px) {
    .toast {
      max-width: calc(100vw - 2rem);
      margin: 0 1rem 1rem;
    }
    
    .toast-content {
      padding: 0.75rem;
      gap: 0.5rem;
    }
    
    .toast-title {
      font-size: 0.9rem;
    }
    
    .toast-message {
      font-size: 0.8rem;
    }
    
    .toast-icon {
      font-size: 1rem;
    }
  }
</style>