<script lang="ts">
  import { onMount } from 'svelte';
  import VoiceInput from '$lib/components/VoiceInput.svelte';
  import ActionLogs from '$lib/components/ActionLogs.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  
  let isRecording = false;
  let isProcessing = false;
  let actionLogs: Array<{ id: number; timestamp: Date; action: string; details: string; type: string }> = [];
  let currentTranscript = '';
  let assistantResponse = '';

  // Mock data for demonstration
  onMount(() => {
    // Add some sample action logs
    actionLogs = [
      {
        id: 1,
        timestamp: new Date('2025-06-29T10:30:00'),
        action: 'Added recipe',
        details: 'Pesto Pasta with Cherry Tomatoes',
        type: 'create'
      },
      {
        id: 2,
        timestamp: new Date('2025-06-29T11:15:00'),
        action: 'Updated last_eaten',
        details: 'Lasagna - marked as eaten today',
        type: 'update'
      },
      {
        id: 3,
        timestamp: new Date('2025-06-29T11:45:00'),
        action: 'Retrieved recipes',
        details: 'Found 3 Italian recipes with pasta',
        type: 'read'
      }
    ];
  });

  function startRecording() {
    isRecording = true;
    currentTranscript = '';
    assistantResponse = '';
    
    // TODO: Implement actual voice recording with OpenAI API
    // For now, simulate recording
    setTimeout(() => {
      currentTranscript = "What pasta recipes do you have that I haven't eaten recently?";
      isRecording = false;
      processVoiceInput();
    }, 3000);
  }

  function stopRecording() {
    isRecording = false;
  }

  function processVoiceInput() {
    isProcessing = true;
    
    // TODO: Send to OpenAI API for processing
    // For now, simulate processing and response
    setTimeout(() => {
      assistantResponse = "I found 2 pasta recipes you haven't eaten recently: Carbonara (last eaten 2 weeks ago) and Linguine with Clams (last eaten 3 weeks ago). Would you like me to show you the details for either of these?";
      
      // Add new action log
      const newAction = {
        id: actionLogs.length + 1,
        timestamp: new Date(),
        action: 'Retrieved recipes',
        details: 'Found 2 pasta recipes not eaten recently',
        type: 'read'
      };
      actionLogs = [newAction, ...actionLogs];
      
      isProcessing = false;
    }, 2000);
  }

  function clearLogs() {
    actionLogs = [];
  }
</script>

<main>
  <PageHeader 
    title="Meal Maestro" 
    subtitle="Your AI-powered recipe assistant with voice control" 
  />

  <div class="container">
    <VoiceInput 
      bind:isRecording
      bind:isProcessing
      bind:currentTranscript
      bind:assistantResponse
      on:startRecording={startRecording}
      on:stopRecording={stopRecording}
    />
    
    <ActionLogs 
      bind:actionLogs
      on:clearLogs={clearLogs}
    />
  </div>
</main>

<style>
  main {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    min-height: 100vh;
  }

  .container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    align-items: start;
  }

  /* Mobile Responsiveness */
  @media (max-width: 768px) {
    .container {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
  }

  @media (max-width: 480px) {
    main {
      padding: 0.5rem;
    }
  }
</style>
