<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { BookOpen , ChatBubbleLeftRight, Cog6Tooth} from '@steeze-ui/heroicons';
  import { Icon } from '@steeze-ui/svelte-icon';
  
  export let currentPath: string = '';
  
  $: currentPath = $page.url.pathname;
  

  interface NavItem {
    path: string;
    label: string;
    icon: typeof BookOpen;
  }

  const navItems: NavItem[] = [
    {
      path: '/',
      label: 'Recipes',
      icon: BookOpen
    },
    {
      path: '/chat',
      label: 'Chat',
      icon: ChatBubbleLeftRight
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: Cog6Tooth
    }
  ];
  
  function handleNavClick(path: string) {
    goto(path);
  }
  
  function isActive(itemPath: string): boolean {
    if (itemPath === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(itemPath);
  }
</script>

<nav class="bottom-nav" aria-label="Main navigation">
  <div class="nav-container">
    {#each navItems as item}
      <button
        class="nav-item"
        class:active={isActive(item.path)}
        on:click={() => handleNavClick(item.path)}
        aria-label={`Navigate to ${item.label}`}
        type="button"
      >
        <span class="nav-icon" aria-hidden="true">
          <Icon src={item.icon} size="22px" theme="default" class="icon-svg" />
        </span>
        <span class="nav-label">{item.label}</span>
      </button>
    {/each}
  </div>
</nav>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: var(--surface-color, #ffffff);
    border-top: 1px solid var(--border-color, #e5e7eb);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    /* Safe area handling for devices with home indicator */
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
  
  .nav-container {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 8px 0 12px 0;
    max-width: 100%;
  }
  
  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 12px;
    min-width: 60px;
    min-height: 44px; /* Minimum touch target size */
    color: var(--text-secondary, #6b7280);
    -webkit-tap-highlight-color: transparent;
  }
  
  .nav-item:hover {
    background-color: var(--hover-color, #f3f4f6);
  }
  
  .nav-item:active {
    transform: scale(0.95);
    background-color: var(--active-color, #e5e7eb);
  }
  
  .nav-item.active {
    color: var(--primary-color, #3b82f6);
    background-color: var(--primary-bg, #dbeafe);
  }
  
  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    filter: grayscale(0.3);
    transition: filter 0.2s ease;
  }

  .nav-item.active .nav-icon {
    filter: grayscale(0);
    transform: scale(1.1);
  }
  
  .nav-label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.01em;
    text-align: center;
    white-space: nowrap;
  }
  
  .nav-item.active .nav-label {
    font-weight: 600;
  }
  
  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .bottom-nav {
      background: var(--surface-color, #1f2937);
      border-top-color: var(--border-color, #374151);
    }
    
    .nav-item {
      color: var(--text-secondary, #9ca3af);
    }
    
    .nav-item:hover {
      background-color: var(--hover-color, #374151);
    }
    
    .nav-item:active {
      background-color: var(--active-color, #4b5563);
    }
    
    .nav-item.active {
      color: var(--primary-color, #60a5fa);
      background-color: var(--primary-bg, #1e3a8a);
    }
  }
  
  /* Tablet and desktop - hide bottom nav */
  @media (min-width: 768px) {
    .bottom-nav {
      display: none;
    }
  }
</style>