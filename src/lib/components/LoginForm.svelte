<script lang="ts">
  import { authStore, isLoading, isAuthenticated } from '$lib/stores/auth.js';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    success: { message: string };
    error: { message: string };
  }>();

  let errorMessage = '';
  let successMessage = '';

  async function handleGoogleSignIn() {
    errorMessage = '';
    successMessage = '';
    
    try {
      const result = await authStore.signInWithGoogle();
      
      if (result.success) {
        successMessage = 'Redirecting to Google...';
        dispatch('success', { message: 'Sign in initiated successfully' });
      } else {
        errorMessage = result.error || 'Failed to sign in with Google';
        dispatch('error', { message: errorMessage });
      }
    } catch (error) {
      errorMessage = 'An unexpected error occurred';
      dispatch('error', { message: errorMessage });
    }
  }

  async function handleSignOut() {
    errorMessage = '';
    successMessage = '';
    
    try {
      const result = await authStore.signOut();
      
      if (result.success) {
        successMessage = 'Signed out successfully';
        dispatch('success', { message: 'Signed out successfully' });
      } else {
        errorMessage = result.error || 'Failed to sign out';
        dispatch('error', { message: errorMessage });
      }
    } catch (error) {
      errorMessage = 'An unexpected error occurred';
      dispatch('error', { message: errorMessage });
    }
  }
</script>

<div class="auth-container">
  {#if $isAuthenticated}
    <!-- User is authenticated - show sign out -->
    <div class="auth-card">
      <h2>Welcome back!</h2>
      <p>You are currently signed in.</p>
      
      <button
        class="sign-out-button"
        on:click={handleSignOut}
        disabled={$isLoading}
      >
        {#if $isLoading}
          <span class="spinner"></span>
          Signing out...
        {:else}
          Sign Out
        {/if}
      </button>
    </div>
  {:else}
    <!-- User is not authenticated - show sign in options -->
    <div class="auth-card">
      <h2>Sign in to Meal Maestro</h2>
      <p>Sign in to save and manage your personal recipe collection</p>
      
      <button
        class="google-sign-in-button"
        on:click={handleGoogleSignIn}
        disabled={$isLoading}
      >
        {#if $isLoading}
          <span class="spinner"></span>
          Signing in...
        {:else}
          <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        {/if}
      </button>
    </div>
  {/if}

  <!-- Messages -->
  {#if errorMessage}
    <div class="message error" role="alert">
      {errorMessage}
    </div>
  {/if}

  {#if successMessage}
    <div class="message success" role="status">
      {successMessage}
    </div>
  {/if}
</div>

<style>
  .auth-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
  }

  .auth-card {
    background: var(--bg-secondary, #f8f9fa);
    border-radius: 12px;
    padding: 2rem;
    max-width: 400px;
    width: 100%;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--border-color, #e9ecef);
  }

  h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #333);
    font-size: 1.5rem;
    font-weight: 600;
  }

  p {
    margin: 0 0 2rem 0;
    color: var(--text-secondary, #666);
    line-height: 1.5;
  }

  .google-sign-in-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1.5rem;
    background: #fff;
    color: #333;
    border: 1px solid #dadce0;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 48px;
  }

  .google-sign-in-button:hover:not(:disabled) {
    background: #f8f9fa;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .google-sign-in-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .sign-out-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 2rem;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 48px;
  }

  .sign-out-button:hover:not(:disabled) {
    background: #c82333;
  }

  .sign-out-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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

  .message {
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    max-width: 400px;
    width: 100%;
    text-align: center;
  }

  .message.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  .message.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .auth-card {
      background: var(--bg-secondary, #2d3748);
      border-color: var(--border-color, #4a5568);
    }

    h2 {
      color: var(--text-primary, #f7fafc);
    }

    p {
      color: var(--text-secondary, #e2e8f0);
    }

    .google-sign-in-button {
      background: #fff;
      color: #333;
    }
  }
</style>