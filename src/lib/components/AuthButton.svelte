<script lang="ts">
  import { authStore, isAuthenticated, user, userProfile, isLoading } from '$lib/stores/auth.js';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    signInSuccess: void;
    signOutSuccess: void;
    error: { message: string };
  }>();

  let showDropdown = false;
  let dropdownElement: HTMLDivElement;

  async function handleSignIn() {
    try {
      const result = await authStore.signInWithGoogle();
      
      if (result.success) {
        dispatch('signInSuccess');
      } else {
        dispatch('error', { message: result.error || 'Sign in failed' });
      }
    } catch (error) {
      dispatch('error', { message: 'An unexpected error occurred' });
    }
  }

  async function handleSignOut() {
    try {
      const result = await authStore.signOut();
      
      if (result.success) {
        showDropdown = false;
        dispatch('signOutSuccess');
      } else {
        dispatch('error', { message: result.error || 'Sign out failed' });
      }
    } catch (error) {
      dispatch('error', { message: 'An unexpected error occurred' });
    }
  }

  function toggleDropdown() {
    showDropdown = !showDropdown;
  }

  function closeDropdown(event: Event) {
    if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
      showDropdown = false;
    }
  }

  // Close dropdown when clicking outside
  $: if (typeof window !== 'undefined') {
    if (showDropdown) {
      document.addEventListener('click', closeDropdown);
    } else {
      document.removeEventListener('click', closeDropdown);
    }
  }

  function getDisplayName(): string {
    if ($userProfile?.display_name) {
      return $userProfile.display_name;
    }
    if ($user?.email) {
      return $user.email.split('@')[0];
    }
    return 'User';
  }

  function getInitials(): string {
    const name = getDisplayName();
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
</script>

<div class="auth-container">
  {#if $isAuthenticated}
    <!-- User is authenticated - show user menu -->
    <div class="user-menu" bind:this={dropdownElement}>
      <button 
        class="user-button"
        on:click={toggleDropdown}
        disabled={$isLoading}
      >
        <div class="user-avatar">
          {#if $userProfile?.avatar_url}
            <img src={$userProfile.avatar_url} alt="User avatar" />
          {:else}
            <span class="user-initials">{getInitials()}</span>
          {/if}
        </div>
        <span class="user-name">{getDisplayName()}</span>
        <svg 
          class="dropdown-arrow" 
          class:rotated={showDropdown}
          viewBox="0 0 20 20" 
          width="16" 
          height="16"
        >
          <path fill="currentColor" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
        </svg>
      </button>

      {#if showDropdown}
        <div class="dropdown-menu">
          <div class="dropdown-header">
            <div class="user-info">
              <div class="user-avatar large">
                {#if $userProfile?.avatar_url}
                  <img src={$userProfile.avatar_url} alt="User avatar" />
                {:else}
                  <span class="user-initials">{getInitials()}</span>
                {/if}
              </div>
              <div class="user-details">
                <div class="user-display-name">{getDisplayName()}</div>
                {#if $user?.email}
                  <div class="user-email">{$user.email}</div>
                {/if}
              </div>
            </div>
          </div>
          
          <div class="dropdown-divider"></div>
          
          <button
            class="dropdown-item"
            on:click={handleSignOut}
            disabled={$isLoading}
          >
            {#if $isLoading}
              <span class="spinner"></span>
              Signing out...
            {:else}
              <svg class="dropdown-icon" viewBox="0 0 20 20" width="16" height="16">
                <path fill="currentColor" d="M3 3a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 13.846 4.632 16 6.414 16H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 6H6.28l-.31-1.243A1 1 0 005 4H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
              </svg>
              Sign Out
            {/if}
          </button>
        </div>
      {/if}
    </div>
  {:else}
    <!-- User is not authenticated - show sign in button -->
    <button
      class="sign-in-button"
      on:click={handleSignIn}
      disabled={$isLoading}
    >
      {#if $isLoading}
        <span class="spinner"></span>
        Signing in...
      {:else}
        <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign In
      {/if}
    </button>
  {/if}
</div>

<style>
  .auth-container {
    position: relative;
  }

  .sign-in-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #fff;
    color: #333;
    border: 1px solid #dadce0;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .sign-in-button:hover:not(:disabled) {
    background: #f8f9fa;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .sign-in-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .user-menu {
    position: relative;
  }

  .user-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem;
    background: none;
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--text-primary, #333);
  }

  .user-button:hover:not(:disabled) {
    background: var(--surface, #f8f9fa);
    border-color: var(--border, #e5e7eb);
  }

  .user-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    overflow: hidden;
    background: var(--primary, #3b82f6);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .user-avatar.large {
    width: 40px;
    height: 40px;
  }

  .user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .user-initials {
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .user-name {
    font-size: 0.9rem;
    font-weight: 500;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dropdown-arrow {
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .dropdown-arrow.rotated {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    min-width: 280px;
    background: var(--surface, #ffffff);
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    margin-top: 0.25rem;
    animation: dropdownFade 0.2s ease-out;
  }

  .dropdown-header {
    padding: 1rem;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-details {
    flex: 1;
    min-width: 0;
  }

  .user-display-name {
    font-weight: 600;
    color: var(--text-primary, #333);
    font-size: 0.95rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-email {
    font-size: 0.85rem;
    color: var(--text-secondary, #6b7280);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dropdown-divider {
    height: 1px;
    background: var(--border, #e5e7eb);
    margin: 0 0.5rem;
  }

  .dropdown-item {
    width: 100%;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--text-primary, #333);
    font-size: 0.9rem;
    transition: background-color 0.2s ease;
  }

  .dropdown-item:hover:not(:disabled) {
    background: var(--background, #f8f9fa);
  }

  .dropdown-item:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .dropdown-icon {
    flex-shrink: 0;
    color: var(--text-secondary, #6b7280);
  }

  .google-icon {
    flex-shrink: 0;
  }

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes dropdownFade {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .sign-in-button {
      background: #374151;
      color: #f9fafb;
      border-color: #4b5563;
    }

    .sign-in-button:hover:not(:disabled) {
      background: #4b5563;
    }
  }

  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .user-name {
      display: none;
    }

    .dropdown-menu {
      min-width: 260px;
      right: -0.5rem;
    }

    .sign-in-button {
      padding: 0.5rem 0.75rem;
      font-size: 0.85rem;
    }
  }
</style>