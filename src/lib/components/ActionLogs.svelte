<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  interface ActionLog {
    id: string;
    action_type: 'create' | 'update' | 'delete' | 'search';
    recipe_id?: string;
    description: string;
    details?: Record<string, any>;
    timestamp: string;
  }
  
  export let actionLogs: ActionLog[] = [];
  export let autoRefresh = true;
  
  let isLoading = false;
  let error = '';
  let refreshInterval: NodeJS.Timeout;

  onMount(() => {
    fetchActionLogs();
    
    if (autoRefresh) {
      // Refresh every 5 seconds
      refreshInterval = setInterval(fetchActionLogs, 5000);
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  });

  async function fetchActionLogs() {
    try {
      isLoading = true;
      error = '';
      
      const response = await fetch('/api/recipes/actions');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch action logs');
      }
      
      actionLogs = data.action_logs || [];
    } catch (err) {
      console.error('Error fetching action logs:', err);
      error = err instanceof Error ? err.message : 'Failed to fetch action logs';
    } finally {
      isLoading = false;
    }
  }

  function clearLogs() {
    dispatch('clearLogs');
  }

  function formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    });
  }

  function getActionIcon(type: string): string {
    switch(type) {
      case 'create': return '➕';
      case 'update': return '✏️';
      case 'search': return '🔍';
      case 'delete': return '🗑️';
      default: return '📝';
    }
  }
</script>

<section class="logs-section">
  <div class="logs-header">
    <h2>Action History</h2>
    <div class="header-actions">
      {#if isLoading}
        <div class="loading-spinner"></div>
      {/if}
      <button class="refresh-button" on:click={fetchActionLogs} disabled={isLoading}>
        🔄
      </button>
      {#if actionLogs.length > 0}
        <button class="clear-button" on:click={clearLogs}>Clear All</button>
      {/if}
    </div>
  </div>
  
  <div class="logs-container">
    {#if error}
      <div class="error-state">
        <p>Error: {error}</p>
        <button on:click={fetchActionLogs}>Try Again</button>
      </div>
    {:else if actionLogs.length === 0 && !isLoading}
      <div class="empty-state">
        <p>No actions performed yet.</p>
        <p class="empty-hint">Start by asking me about your recipes!</p>
      </div>
    {:else}
      {#each actionLogs as log (log.id)}
        <div class="log-item">
          <div class="log-icon">
            {getActionIcon(log.action_type)}
          </div>
          <div class="log-content">
            <div class="log-main">
              <span class="log-action">{log.description}</span>
              <span class="log-timestamp">{formatTimestamp(log.timestamp)}</span>
            </div>
            {#if log.details}
              <div class="log-details">
                {#if log.details.searchQuery}
                  Query: "{log.details.searchQuery}"
                {:else if log.details.changedFields}
                  Changed: {log.details.changedFields.join(', ')}
                {:else if log.details.newData?.title}
                  Recipe: {log.details.newData.title}
                {:else if log.details.originalData?.title}
                  Recipe: {log.details.originalData.title}
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</section>

<style>
  .logs-section {
    background: var(--surface);
    border-radius: 16px;
    padding: 2rem;
    border: 1px solid var(--border);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    max-height: 600px;
    display: flex;
    flex-direction: column;
  }

  .logs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .logs-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border);
    border-top: 2px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .refresh-button {
    background: none;
    border: 1px solid var(--border);
    color: var(--text-light);
    padding: 0.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .refresh-button:hover:not(:disabled) {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }

  .refresh-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .clear-button {
    background: none;
    border: 1px solid var(--border);
    color: var(--text-light);
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }

  .clear-button:hover {
    background: var(--error);
    color: white;
    border-color: var(--error);
  }

  .error-state {
    text-align: center;
    padding: 2rem;
    color: var(--error);
  }

  .error-state button {
    background: var(--primary);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    margin-top: 1rem;
  }

  .logs-container {
    flex: 1;
    overflow-y: auto;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-light);
  }

  .empty-state p {
    margin: 0.5rem 0;
  }

  .empty-hint {
    font-size: 0.875rem;
    font-style: italic;
  }

  .log-item {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 0.5rem;
    transition: background-color 0.2s ease;
  }

  .log-item:hover {
    background: var(--background);
  }

  .log-icon {
    font-size: 1.25rem;
    min-width: 24px;
    text-align: center;
  }

  .log-content {
    flex: 1;
  }

  .log-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .log-action {
    font-weight: 600;
    color: var(--text);
  }

  .log-timestamp {
    font-size: 0.75rem;
    color: var(--text-light);
  }

  .log-details {
    font-size: 0.875rem;
    color: var(--text-light);
    line-height: 1.4;
  }

  /* Animations */
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Mobile Responsiveness */
  @media (max-width: 768px) {
    .logs-section {
      padding: 1.5rem;
      max-height: 400px;
    }
  }

  @media (max-width: 480px) {
    .logs-section {
      padding: 1rem;
    }

    .logs-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .log-main {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
  }
</style>
