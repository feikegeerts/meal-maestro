<script lang="ts">
  import { onMount } from "svelte";
  import TimelineView from "$lib/components/TimelineView.svelte";
  import LoginForm from "$lib/components/LoginForm.svelte";
  import type { CareerEvent } from "$lib/types";
  import { authService } from "$lib/services/authService";
  
  let selectedEventId: number | null = null;
  let isTransitioning = false;
  let timelineViewComponent: TimelineView;
  let careerEvents: CareerEvent[] = [];
  let error: string | null = null;
  
  // Authentication states
  let isAuthenticated = false;
  let isAuthenticating = false;
  let authError: string | null = null;
  let csrfToken: string | null = null;

  onMount(() => {
    // Check for an existing session
    if (authService.hasCsrfToken()) {
      // If we have a token, try to fetch career events
      csrfToken = authService.getCsrfToken();
      checkAuthentication();
    }

    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("wheel", handleWheel);
    };
  });
  
  async function checkAuthentication() {
    try {
      const result = await authService.checkAuthentication();
      
      if (result.isAuthenticated && result.data) {
        careerEvents = result.data.careerEvents;
        isAuthenticated = true;
        csrfToken = authService.getCsrfToken();
      } else {
        isAuthenticated = false;
        if (result.error) {
          error = result.error;
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        error = "An error occurred while loading data";
        console.error('Error loading career events:', err);
      }
    }
  }

  function onAuthSuccessCallback(tokenValue: string) {
    csrfToken = tokenValue;
    isAuthenticated = true;
    checkAuthentication();
  }
  
  function onAuthFailureCallback(error: string) {
    authError = error;
  }

  function selectEvent(id: number): void {
    selectedEventId = id;
    setTimeout(() => {
      timelineViewComponent.scrollSelectedIntoView();
    }, 10);
  }

  function closeDetailedView(): void {
    selectedEventId = null;
  }

  function goToNextEvent(): void {
    if (selectedEventId === null) {
      if (careerEvents.length > 0) {
        selectedEventId = careerEvents[0].id;
        setTimeout(() => {
          timelineViewComponent.scrollSelectedIntoView();
        }, 10);
      }
      return;
    }

    const currentIndex = careerEvents.findIndex(
      (event) => event.id === selectedEventId
    );
    if (currentIndex < careerEvents.length - 1) {
      selectedEventId = careerEvents[currentIndex + 1].id;
      setTimeout(() => {
        timelineViewComponent.scrollSelectedIntoView();
      }, 10);
    }
  }

  function goToPreviousEvent(): void {
    if (selectedEventId === null) {
      if (careerEvents.length > 0) {
        selectedEventId = careerEvents[careerEvents.length - 1].id;
        setTimeout(() => {
          timelineViewComponent.scrollSelectedIntoView();
        }, 10);
      }
      return;
    }

    const currentIndex = careerEvents.findIndex(
      (event) => event.id === selectedEventId
    );
    if (currentIndex > 0) {
      selectedEventId = careerEvents[currentIndex - 1].id;
      setTimeout(() => {
        timelineViewComponent.scrollSelectedIntoView();
      }, 10);
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "Escape":
        closeDetailedView();
        break;
      case "ArrowDown":
      case "ArrowRight":
        goToNextEvent();
        break;
      case "ArrowUp":
      case "ArrowLeft":
        goToPreviousEvent();
        break;
    }
  }

  let wheelAccumulator = 0;
  const WHEEL_THRESHOLD = 50;

  function handleWheel(event: WheelEvent): void {
    event.preventDefault();

    wheelAccumulator += Math.abs(event.deltaY);

    if (wheelAccumulator < WHEEL_THRESHOLD) return;

    wheelAccumulator = 0;

    // Throttle to prevent too rapid navigation
    if (isTransitioning) return;

    isTransitioning = true;
    setTimeout(() => {
      isTransitioning = false;
    }, 500);

    if (event.deltaY > 0) {
      goToNextEvent();
    } else {
      goToPreviousEvent();
    }
  }
</script>

<main>
  <header>
    <h1>My Career Timeline - Vercel edition</h1>
    <p>A chronological journey through my professional experience</p>
  </header>

  {#if error}
    <div class="error">{error}</div>
  {/if}
  
  {#if !isAuthenticated}
    <LoginForm 
      bind:isAuthenticating
      bind:authError
      onAuthSuccess={onAuthSuccessCallback}
      onAuthFailure={onAuthFailureCallback}
    />
  {:else}
    <TimelineView
      {careerEvents}
      {selectedEventId}
      onSelect={selectEvent}
      onClose={closeDetailedView}
      bind:this={timelineViewComponent}
    />
  {/if}
</main>

<style>
  main {
    padding: 2em;
    max-width: 800px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  }

  header {
    text-align: center;
    margin-bottom: 3em;
  }

  h1 {
    color: var(--primary);
    font-size: 2.5em;
    margin-bottom: 0.5em;
  }

  .error {
    color: red;
    text-align: center;
    padding: 1em;
    background-color: #ffeeee;
    border-radius: 4px;
    max-width: 600px;
    margin: 2em auto;
  }
</style>