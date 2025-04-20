<script lang="ts">
  import { authService } from "$lib/services/authService";
  
  // Define props
  export let isAuthenticating: boolean = false;
  export let authError: string | null = null;
  
  // Define callback props to replace event dispatching
  export let onAuthSuccess: (csrfToken: string) => void = () => {};
  export let onAuthFailure: (error: string) => void = () => {};
  
  // Local state
  let password: string = "";

  async function handleSubmit() {
    isAuthenticating = true;
    
    try {
      const result = await authService.login(password);
      
      if (result.success && result.csrfToken) {
        // Clear password from memory
        password = "";
        authError = null;
        
        // Notify parent of successful login using callback prop
        onAuthSuccess(result.csrfToken);
      } else {
        authError = result.error || "Authentication failed";
        onAuthFailure(authError);
      }
    } catch (err) {
      authError = "Authentication error occurred";
      onAuthFailure(authError);
    } finally {
      isAuthenticating = false;
    }
  }
</script>

<div class="login-container">
  <form on:submit|preventDefault={handleSubmit} class="login-form">
    <h2>Password Protected</h2>
    <p>For privacy reasons, my career timeline is protected. You can request the password by contacting me directly.</p>
    {#if authError}
      <div class="auth-error">{authError}</div>
    {/if}
    
    <div class="form-group">
      <label for="password">Password</label>
      <input 
        type="password" 
        id="password" 
        bind:value={password} 
        placeholder="Enter password"
        autocomplete="current-password"
      />
    </div>
    
    <button type="submit" class="login-button" disabled={isAuthenticating}>
      {isAuthenticating ? 'Authenticating...' : 'Login'}
    </button>
  </form>
</div>

<style>
  .login-container {
    max-width: 400px;
    margin: 2em auto;
    padding: 2em;
    background-color: var(--surface);
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .login-form {
    display: flex;
    flex-direction: column;
    gap: 1.5em;
  }
  
  .login-form h2 {
    margin: 0;
    color: var(--primary);
    font-size: 1.5em;
    text-align: center;
  }
  
  .login-form p {
    margin: 0;
    text-align: center;
    opacity: 0.8;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }
  
  .form-group label {
    font-weight: 500;
  }
  
  .form-group input {
    padding: 0.75em;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1em;
  }
  
  .login-button {
    padding: 0.75em 1.5em;
    background-color: var(--primary);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1em;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .login-button:hover {
    background-color: var(--primary-dark, #3a6bc5);
  }
  
  .login-button:disabled {
    background-color: #aaa;
    cursor: not-allowed;
  }
  
  .auth-error {
    color: #e53935;
    padding: 0.5em;
    background-color: #ffeeee;
    border-radius: 4px;
    text-align: center;
  }
</style>