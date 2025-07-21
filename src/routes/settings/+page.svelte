<script lang="ts">
  import { onMount } from 'svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { Icon } from '@steeze-ui/svelte-icon';
  import { ClipboardDocumentList } from '@steeze-ui/heroicons';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import { isAuthenticated, authStore } from '$lib/stores/auth.js';
  import { toasts } from '$lib/stores/toastStore.js';
  import LoginForm from '$lib/components/LoginForm.svelte';

  let currentTheme = 'light';
  let notificationsEnabled = true;
  let voiceEnabled = true;
  let language = 'en';
  let recipeCount = 0;
  let lastSync = '';
  let isClearing = false;

  const languages = [
    { code: 'nl', name: 'Nederlands' },
    { code: 'en', name: 'English' }
  ];

  async function loadSettings() {
    try {
      // Load theme
      const savedTheme = localStorage.getItem('theme') || 'light';
      currentTheme = savedTheme;

      // Load other settings from localStorage
      notificationsEnabled = localStorage.getItem('notifications') !== 'false';
      voiceEnabled = localStorage.getItem('voice') !== 'false';
      language = localStorage.getItem('language') || 'en';

      // Get recipe count
      if ($isAuthenticated) {
        const response = await fetch('/api/recipes', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          recipeCount = data.recipes?.length || 0;
        }
      }

      lastSync = localStorage.getItem('lastSync') || 'Never';
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  function handleThemeChange(event: CustomEvent<string>) {
    currentTheme = event.detail;
    localStorage.setItem('theme', currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
    toasts.success('Theme Updated', `Switched to ${currentTheme} mode`);
  }

  function handleThemeCheckboxChange(event: Event) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    handleThemeChange(new CustomEvent('change', { detail: checked ? 'dark' : 'light' }));
  }

  function updateSetting(key: string, value: boolean | string) {
    localStorage.setItem(key, value.toString());
    
    switch (key) {
      case 'notifications':
        notificationsEnabled = value as boolean;
        toasts.success('Notifications', notificationsEnabled ? 'Enabled' : 'Disabled');
        break;
      case 'language':
        language = value as string;
        toasts.success('Language', `Changed to ${languages.find(l => l.code === language)?.name}`);
        break;
    }
  }

  async function clearAllData() {
    if (!confirm('Are you sure you want to clear all your recipes? This action cannot be undone.')) {
      return;
    }

    try {
      isClearing = true;
      const response = await fetch('/api/recipes/clear', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        recipeCount = 0;
        toasts.success('Data Cleared', 'All recipes have been deleted');
      } else {
        throw new Error('Failed to clear data');
      }
    } catch (error) {
      console.error('Failed to clear data:', error);
      toasts.error('Clear Failed', 'Unable to clear data. Please try again.');
    } finally {
      isClearing = false;
    }
  }

  async function exportData() {
    try {
      const response = await fetch('/api/recipes', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.recipes, null, 2)], {
          type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meal-maestro-recipes-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        toasts.success('Export Complete', 'Recipes downloaded successfully');
      } else {
        throw new Error('Failed to export data');
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      toasts.error('Export Failed', 'Unable to export data. Please try again.');
    }
  }

  async function signOut() {
    try {
      await authStore.signOut();
      toasts.success('Signed Out', 'You have been signed out successfully');
    } catch (error) {
      console.error('Sign out failed:', error);
      toasts.error('Sign Out Failed', 'Unable to sign out. Please try again.');
    }
  }

  function handleAuthSuccess() {
    toasts.success('Welcome!', 'You are now signed in.');
    loadSettings();
  }

  function handleAuthError(event: CustomEvent<{ message: string }>) {
    toasts.error('Sign In Error', event.detail.message);
  }

  onMount(() => {
    loadSettings();
  });

  // Watch for authentication changes
  $: if ($isAuthenticated) {
    loadSettings();
  }
</script>

<svelte:head>
  <title>Settings - Meal Maestro</title>
</svelte:head>

<main class="settings-page">
  {#if $isAuthenticated}
    <div class="settings-container">
      <!-- Appearance Settings -->
      <section class="settings-section">
        <h2 class="section-title">Appearance</h2>
        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <h3 class="setting-name">Theme</h3>
              <p class="setting-description">Choose between light and dark mode</p>
            </div>
            <div class="setting-control">
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  checked={currentTheme === 'dark'}
                  on:change={handleThemeCheckboxChange}
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <!-- App Settings -->
      <section class="settings-section">
        <h2 class="section-title">Preferences</h2>
        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <h3 class="setting-name">Notifications</h3>
              <p class="setting-description">Get notified about recipe updates and tips</p>
            </div>
            <div class="setting-control">
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  bind:checked={notificationsEnabled}
                  on:change={() => updateSetting('notifications', notificationsEnabled)}
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3 class="setting-name">Language</h3>
              <p class="setting-description">Choose your preferred language</p>
            </div>
            <div class="setting-control">
              <select 
                class="setting-select"
                bind:value={language}
                on:change={() => updateSetting('language', language)}
              >
                {#each languages as lang}
                  <option value={lang.code}>{lang.name}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>
      </section>

      <!-- Data Management -->
      <section class="settings-section">
        <h2 class="section-title">Data Management</h2>
        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <h3 class="setting-name">Recipe Collection</h3>
              <p class="setting-description">{recipeCount} recipes stored</p>
            </div>
            <div class="setting-control">
              <button
                class="setting-button secondary"
                on:click={exportData}
                type="button"
              >
                Export
              </button>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3 class="setting-name">Clear All Data</h3>
              <p class="setting-description">Remove all recipes and reset the app</p>
            </div>
            <div class="setting-control">
              <button
                class="setting-button danger"
                on:click={clearAllData}
                disabled={isClearing || recipeCount === 0}
                type="button"
              >
                {isClearing ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Account -->
      <section class="settings-section">
        <h2 class="section-title">Account</h2>
        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <h3 class="setting-name">Sign Out</h3>
              <p class="setting-description">Sign out of your account</p>
            </div>
            <div class="setting-control">
              <button
                class="setting-button danger"
                on:click={signOut}
                type="button"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- App Info -->
      <section class="settings-section" aria-labelledby="about-title">
        <h2 class="section-title" id="about-title">About</h2>
        <div class="settings-group">
          <div class="app-info" role="region" aria-label="App Information">
            <div class="app-icon" aria-hidden="true"><Icon src={ClipboardDocumentList} size="48" /></div>
            <div class="app-details">
              <h3 class="app-name">Meal Maestro</h3>
              <p class="app-version">Version 1.0.0</p>
              <p class="app-description">Your AI-powered recipe assistant</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  {:else}
    <div class="auth-section">
      <div class="auth-card">
        <h1 class="auth-title">Sign In Required</h1>
        <p class="auth-subtitle">Please sign in to access settings</p>
        <LoginForm 
          on:success={handleAuthSuccess}
          on:error={handleAuthError}
        />
      </div>
    </div>
  {/if}
</main>

<ToastContainer />

<style>
  .settings-page {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    background: var(--background, #f8fafc);
  }

  .settings-container {
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .settings-section {
    background: var(--surface, #ffffff);
    border-radius: 16px;
    padding: 24px;
    border: 1px solid var(--border, #e5e7eb);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .section-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary, #111827);
    margin: 0 0 20px 0;
    letter-spacing: -0.01em;
  }

  .settings-group {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid var(--border-light, #f3f4f6);
  }

  .setting-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .setting-item:first-child {
    padding-top: 0;
  }

  .setting-info {
    flex: 1;
  }

  .setting-name {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-primary, #111827);
    margin: 0 0 4px 0;
    letter-spacing: -0.01em;
  }

  .setting-description {
    font-size: 14px;
    color: var(--text-secondary, #6b7280);
    margin: 0;
    line-height: 1.4;
  }

  .setting-control {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  /* Toggle Switch */
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 52px;
    height: 32px;
    cursor: pointer;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--border, #e5e7eb);
    transition: 0.2s;
    border-radius: 32px;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 24px;
    width: 24px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: 0.2s;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  input:checked + .toggle-slider {
    background-color: var(--primary, #3b82f6);
  }

  input:checked + .toggle-slider:before {
    transform: translateX(20px);
  }

  /* Select */
  .setting-select {
    padding: 8px 12px;
    border: 2px solid var(--border, #e5e7eb);
    border-radius: 8px;
    background: var(--background, #f8fafc);
    color: var(--text-primary, #111827);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 0.2s ease;
    min-width: 120px;
  }

  .setting-select:focus {
    outline: none;
    border-color: var(--primary, #3b82f6);
    background: var(--surface, #ffffff);
  }

  /* Buttons */
  .setting-button {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
    min-height: 36px;
    min-width: 80px;
  }

  .setting-button.secondary {
    background: var(--background, #f8fafc);
    color: var(--text-primary, #111827);
    border-color: var(--border, #e5e7eb);
  }

  .setting-button.secondary:hover {
    background: var(--surface, #ffffff);
    border-color: var(--primary-light, #93c5fd);
  }

  .setting-button.danger {
    background: var(--error-light, #fef2f2);
    color: var(--error, #dc2626);
    border-color: var(--error-light, #fecaca);
  }

  .setting-button.danger:hover {
    background: var(--error, #dc2626);
    color: white;
    border-color: var(--error, #dc2626);
  }

  .setting-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .setting-button:disabled:hover {
    background: var(--error-light, #fef2f2);
    color: var(--error, #dc2626);
    border-color: var(--error-light, #fecaca);
  }

  /* App Info */
  .app-info {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-5);
    background: var(--primary-bg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
  }

  .app-icon {
    font-size: var(--text-4xl);
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    color: var(--text-primary);
  }

  .app-details {
    flex: 1;
  }

  .app-name {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 var(--space-1) 0;
    letter-spacing: -0.01em;
  }

  .app-version {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    margin: 0 0 var(--space-1) 0;
    font-weight: 600;
  }

  .app-description {
    font-size: var(--text-base);
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
    font-weight: 500;
  }

  /* Auth Section */
  .auth-section {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    padding: 20px;
  }

  .auth-card {
    background: var(--surface, #ffffff);
    border-radius: 16px;
    padding: 32px 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--border, #e5e7eb);
    text-align: center;
    max-width: 400px;
    width: 100%;
  }

  .auth-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary, #111827);
    margin: 0 0 8px 0;
    letter-spacing: -0.01em;
  }

  .auth-subtitle {
    font-size: 14px;
    color: var(--text-secondary, #6b7280);
    margin: 0 0 24px 0;
    line-height: 1.4;
  }
  /* Tablet and desktop adjustments */
  @media (min-width: 768px) {
    .settings-container {
      padding: 40px 20px;
    }

    .settings-section {
      padding: 32px;
    }

    .setting-item {
      padding: 20px 0;
      align-items: center;
    }
  }
</style>