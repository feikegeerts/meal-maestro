
<script lang="ts">
import { page } from '$app/state';
import { goto } from '$app/navigation';
import { BookOpen, ChatBubbleLeftRight, Cog6Tooth } from '@steeze-ui/heroicons';
import { Icon } from '@steeze-ui/svelte-icon';

interface NavItem {
  path: string;
  label: string;
  icon: any;
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
    return page.url.pathname === '/';
  }
  return page.url.pathname.startsWith(itemPath);
}
</script>

<header class="top-nav" aria-label="Main navigation">
  <div class="nav-container">
    <!-- App branding section -->
    <div class="nav-brand">
      <button 
        class="brand-button"
        onclick={() => handleNavClick('/')}
        aria-label="Go to home page"
      >
        <span class="brand-icon">🍽️</span>
        <span class="brand-text">Meal Maestro</span>
      </button>
    </div>

    <!-- Navigation items -->
    <nav class="nav-items" aria-label="Main sections">
      {#each navItems as item}
        <button
          class="nav-item"
          class:active={isActive(item.path)}
          onclick={() => handleNavClick(item.path)}
          aria-label={`Navigate to ${item.label}`}
          type="button"
        >
          <span class="nav-icon" aria-hidden="true">
            <Icon src={item.icon} size="20px" theme="default" />
          </span>
          <span class="nav-label">{item.label}</span>
        </button>
      {/each}
    </nav>

      

  </div>
</header>

<style>
  .top-nav {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: var(--surface-color, #ffffff);
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    /* Safe area handling for devices with notch */
    padding-top: env(safe-area-inset-top, 0);
  }
  
  .nav-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    max-width: 1200px;
    margin: 0 auto;
    gap: 16px;
  }
  
  .nav-brand {
    flex-shrink: 0;
  }
  
  .brand-button {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: background-color 0.2s ease;
    color: var(--text-primary, #111827);
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }
  
  .brand-button:hover {
    background-color: var(--hover-color, #f3f4f6);
  }
  
  .brand-icon {
    font-size: 24px;
    line-height: 1;
  }
  
  .brand-text {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.025em;
  }
  
  .nav-items {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .nav-item {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 8px;
    min-height: 44px; /* Minimum touch target size */
    color: var(--text-secondary, #6b7280);
    font-size: 14px;
    font-weight: 500;
    -webkit-tap-highlight-color: transparent;
  }
  
  .nav-item:hover {
    background-color: var(--hover-color, #f3f4f6);
    color: var(--text-primary, #111827);
  }
  
  .nav-item:active {
    transform: scale(0.96);
    background-color: var(--active-color, #e5e7eb);
  }
  
  .nav-item.active {
    color: var(--primary-color, #3b82f6);
    background-color: var(--primary-bg, #dbeafe);
    font-weight: 600;
  }
  
  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    filter: grayscale(0.2);
    transition: filter 0.2s ease;
  }

  .nav-item.active .nav-icon {
    filter: grayscale(0);
  }
  
  .nav-label {
    white-space: nowrap;
  }

  /* Mobile responsive design */
  @media (max-width: 767px) {
    .nav-container {
      padding: 8px 16px;
    }
    
    .brand-text {
      display: none; /* Hide brand text on mobile to save space */
    }
    
    .nav-item {
      flex-direction: column;
      gap: 2px;
      padding: 6px 8px;
      min-width: 50px;
    }
    
    .nav-label {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.01em;
      text-align: center;
    }
    
    .nav-item.active .nav-label {
      font-weight: 600;
    }
  }

  /* Tablet and small desktop */
  @media (min-width: 768px) and (max-width: 1023px) {
    .nav-container {
      padding: 14px 20px;
    }
    
    .nav-item {
      padding: 8px 12px;
      font-size: 13px;
    }
  }

  /* Large desktop */
  @media (min-width: 1024px) {
    .nav-container {
      padding: 16px 24px;
    }
    
    .nav-item {
      padding: 10px 16px;
      font-size: 15px;
    }
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .top-nav {
      background: var(--surface-color, #1f2937);
      border-bottom-color: var(--border-color, #374151);
    }
    
    .brand-button {
      color: var(--text-primary, #f9fafb);
    }
    
    .brand-button:hover {
      background-color: var(--hover-color, #374151);
    }
    
    .nav-item {
      color: var(--text-secondary, #9ca3af);
    }
    
    .nav-item:hover {
      background-color: var(--hover-color, #374151);
      color: var(--text-primary, #f9fafb);
    }
    
    .nav-item:active {
      background-color: var(--active-color, #4b5563);
    }
    
    .nav-item.active {
      color: var(--primary-color, #60a5fa);
      background-color: var(--primary-bg, #1e3a8a);
    }
  }
</style>
