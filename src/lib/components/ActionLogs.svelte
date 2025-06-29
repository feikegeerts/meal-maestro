<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let actionLogs: Array<{ id: number; timestamp: Date; action: string; details: string; type: string }> = [];

  function clearLogs() {
    dispatch('clearLogs');
  }

  function formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleString('en-US', {
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
      case 'read': return '🔍';
      case 'delete': return '🗑️';
      default: return '📝';
    }
  }
</script>

<section class="logs-section">
  <div class="logs-header">
    <h2>Action History</h2>
    {#if actionLogs.length > 0}
      <button class="clear-button" on:click={clearLogs}>Clear All</button>
    {/if}
  </div>
  
  <div class="logs-container">
    {#if actionLogs.length === 0}
      <div class="empty-state">
        <p>No actions performed yet.</p>
        <p class="empty-hint">Start by asking me about your recipes!</p>
      </div>
    {:else}
      {#each actionLogs as log (log.id)}
        <div class="log-item">
          <div class="log-icon">
            {getActionIcon(log.type)}
          </div>
          <div class="log-content">
            <div class="log-main">
              <span class="log-action">{log.action}</span>
              <span class="log-timestamp">{formatTimestamp(log.timestamp)}</span>
            </div>
            <div class="log-details">{log.details}</div>
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
