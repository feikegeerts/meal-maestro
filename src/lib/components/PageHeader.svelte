<script>
  import AuthButton from './AuthButton.svelte';
  import { toasts } from '$lib/stores/toastStore.js';
  
  export let title = '';
  export let subtitle = '';
  
  function handleAuthSuccess() {
    toasts.success('Authentication', 'Successfully signed in!');
  }
  
  function handleAuthError(event) {
    toasts.error('Authentication Error', event.detail.message);
  }
  
  function handleSignOutSuccess() {
    toasts.success('Authentication', 'Successfully signed out!');
  }
</script>

<header>
  <div class="header-content">
    <div class="text-content">
      <h1 class="title">{title}</h1>
      <p class="subtitle">{subtitle}</p>
    </div>
    <div class="auth-section">
      <AuthButton 
        on:signInSuccess={handleAuthSuccess}
        on:signOutSuccess={handleSignOutSuccess}
        on:error={handleAuthError}
      />
    </div>
  </div>
</header>

<style>
  header {
    margin-bottom: 2rem;
  }
  
  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  
  .text-content {
    text-align: center;
    flex: 1;
  }

  .title {
    font-size: 2.5em;
    color: var(--primary);
    margin-bottom: 0.5em;
    font-weight: 700;
  }

  .subtitle {
    font-size: 1.2em;
    color: var(--text-light);
    margin-bottom: 0;
  }
  
  .auth-section {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  /* Mobile Responsiveness */
  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      text-align: center;
      gap: 1.5rem;
    }
    
    .title {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1rem;
    }
    
    .auth-section {
      order: -1;
      align-self: flex-end;
    }
  }
  
  @media (max-width: 480px) {
    .auth-section {
      align-self: center;
    }
  }
</style>
