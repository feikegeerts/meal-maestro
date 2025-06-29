<script>
  export let isRecording = false;
  export let isProcessing = false;
  export let currentTranscript = '';
  export let assistantResponse = '';

  export let onStartRecording = () => {};
  export let onStopRecording = () => {};

  function toggleRecording() {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  }
</script>

<section class="voice-section">
  <div class="voice-controls">
    <button 
      class="voice-button" 
      class:recording={isRecording}
      class:processing={isProcessing}
      on:click={toggleRecording}
      disabled={isProcessing}
    >
      {#if isRecording}
        <div class="recording-animation">
          <div class="pulse"></div>
          <div class="pulse"></div>
          <div class="pulse"></div>
        </div>
        🎤
      {:else if isProcessing}
        <div class="processing-spinner"></div>
        🤔
      {:else}
        🎤
      {/if}
    </button>
    
    <div class="voice-status">
      {#if isRecording}
        <p class="status-text recording">Listening...</p>
      {:else if isProcessing}
        <p class="status-text processing">Processing...</p>
      {:else}
        <p class="status-text">Tap to speak</p>
      {/if}
    </div>
  </div>

  <!-- Conversation Display -->
  {#if currentTranscript || assistantResponse}
    <div class="conversation">
      {#if currentTranscript}
        <div class="message user-message">
          <div class="message-header">
            <span class="message-label">You said:</span>
          </div>
          <p>{currentTranscript}</p>
        </div>
      {/if}
      
      {#if assistantResponse}
        <div class="message assistant-message">
          <div class="message-header">
            <span class="message-label">Assistant:</span>
          </div>
          <p>{assistantResponse}</p>
        </div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .voice-section {
    background: var(--surface);
    border-radius: 16px;
    padding: 2rem;
    border: 1px solid var(--border);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }

  .voice-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .voice-button {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: none;
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    color: white;
    font-size: 2.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 25px -5px rgb(59 130 246 / 0.5);
  }

  .voice-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px -5px rgb(59 130 246 / 0.6);
  }

  .voice-button:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .voice-button.recording {
    background: linear-gradient(135deg, var(--error) 0%, #dc2626 100%);
    animation: pulse-glow 2s infinite;
  }

  .voice-button.processing {
    background: linear-gradient(135deg, var(--warning) 0%, #d97706 100%);
  }

  .recording-animation {
    position: absolute;
    inset: -4px;
    border-radius: 50%;
  }

  .pulse {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid var(--error);
    animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .pulse:nth-child(2) {
    animation-delay: 0.5s;
  }

  .pulse:nth-child(3) {
    animation-delay: 1s;
  }

  .processing-spinner {
    position: absolute;
    width: 24px;
    height: 24px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top: 3px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .voice-status {
    margin-top: 1rem;
    text-align: center;
  }

  .status-text {
    font-size: 1.1rem;
    font-weight: 500;
    margin: 0;
  }

  .status-text.recording {
    color: var(--error);
  }

  .status-text.processing {
    color: var(--warning);
  }

  .conversation {
    margin-top: 1rem;
  }

  .message {
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1rem;
  }

  .user-message {
    background: var(--primary);
    color: white;
    margin-left: 0;
    margin-right: 2rem;
  }

  .assistant-message {
    background: var(--surface);
    border: 1px solid var(--border);
    margin-left: 2rem;
    margin-right: 0;
  }

  .message-header {
    margin-bottom: 0.5rem;
  }

  .message-label {
    font-size: 0.875rem;
    font-weight: 600;
    opacity: 0.8;
  }

  .message p {
    margin: 0;
    line-height: 1.5;
  }

  /* Animations */
  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 8px 25px -5px rgb(239 68 68 / 0.5);
    }
    50% {
      box-shadow: 0 8px 25px -5px rgb(239 68 68 / 0.8);
    }
  }

  @keyframes pulse-ring {
    0% {
      transform: scale(0.8);
      opacity: 1;
    }
    100% {
      transform: scale(2);
      opacity: 0;
    }
  }

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
    .voice-section {
      padding: 1.5rem;
    }

    .voice-button {
      width: 100px;
      height: 100px;
      font-size: 2rem;
    }

    .user-message {
      margin-right: 1rem;
    }

    .assistant-message {
      margin-left: 1rem;
    }
  }

  @media (max-width: 480px) {
    .voice-section {
      padding: 1rem;
    }
  }
</style>
