<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabaseBrowser } from '$lib/services/supabaseBrowser.js';

  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      
      const code = $page.url.searchParams.get('code');
      const error_param = $page.url.searchParams.get('error');
      const next = $page.url.searchParams.get('next') ?? '/';

      // Handle OAuth errors from provider
      if (error_param) {
        console.error('OAuth provider error:', error_param);
        error = error_param;
        loading = false;
        setTimeout(() => goto(`/?auth_error=${encodeURIComponent(error_param)}`), 2000);
        return;
      }

      if (code) {
        
        // Use client-side Supabase to exchange the code for a session
        // This has access to the stored code verifier from the PKCE flow
        const { data, error: exchangeError } = await supabaseBrowser.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('Session exchange error:', exchangeError.message);
          error = exchangeError.message;
          loading = false;
          setTimeout(() => goto(`/?auth_error=${encodeURIComponent(exchangeError.message)}`), 2000);
          return;
        }
        
        if (data.session) {
          
          // Set session cookies for server-side API access
          try {
            const response = await fetch('/api/auth/set-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_in: data.session.expires_in
              })
            });
          } catch (cookieError) {
            console.error('Error setting session cookies:', cookieError);
            // Continue anyway - client-side auth will still work
          }
          
          // Successful authentication - redirect to intended page
          loading = false;
          goto(next);
        } else {
          console.error('No session data received from Supabase');
          error = 'No session data received';
          loading = false;
          setTimeout(() => goto('/?auth_error=no_session'), 2000);
        }
      } else {
        // No authorization code provided
        console.error('No authorization code in callback');
        error = 'No authorization code provided';
        loading = false;
        setTimeout(() => goto('/?auth_error=no_code'), 2000);
      }
    } catch (err) {
      console.error('Unexpected callback error:', err);
      error = 'An unexpected error occurred';
      loading = false;
      setTimeout(() => goto('/?auth_error=callback_failed'), 2000);
    }
  });
</script>

<svelte:head>
  <title>Authenticating...</title>
</svelte:head>

<div class="auth-callback">
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <h2>Completing sign in...</h2>
      <p>Please wait while we finish setting up your account.</p>
    </div>
  {:else if error}
    <div class="error">
      <h2>Authentication Error</h2>
      <p>There was an error during sign in: {error}</p>
      <p>Redirecting you back to the home page...</p>
    </div>
  {/if}
</div>

<style>
  .auth-callback {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
  }

  .loading, .error {
    text-align: center;
    max-width: 400px;
  }

  .loading h2, .error h2 {
    margin-bottom: 1rem;
    color: var(--text-primary, #333);
  }

  .loading p, .error p {
    color: var(--text-secondary, #666);
    margin-bottom: 0.5rem;
  }

  .spinner {
    display: inline-block;
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid var(--primary, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error {
    color: #dc2626;
  }
</style>