<script lang="ts">
  import { onMount } from "svelte";
  import TimelineView from "$lib/components/TimelineView.svelte";
  import LoginForm from "$lib/components/LoginForm.svelte";
  import type { CareerEvent } from "$lib/types";
  import { 
    CSRF_COOKIE_NAME, 
    MAX_ATTEMPTS 
  } from "$lib/authConstants";
  
  let selectedEventId: number | null = null;
  let isTransitioning = false;
  let timelineViewComponent: TimelineView;
  let careerEvents: CareerEvent[] = [];
  let error: string | null = null;
  
  // Authentication states
  let isAuthenticated = false;
  let isAuthenticating = false;
  let password = "";
  let authError: string | null = null;
  let csrfToken: string | null = null;

  // Track failed login attempts client-side
  let loginAttempts = 0;
  const MAX_CLIENT_ATTEMPTS = MAX_ATTEMPTS; // Using the same value from authUtils
  let lastAttemptTime = 0;

  onMount(() => {
    // Check for an existing session by looking for the CSRF token cookie
    const existingCsrfToken = getCookie(CSRF_COOKIE_NAME);
    if (existingCsrfToken) {
      // If we have a token, try to fetch career events
      csrfToken = existingCsrfToken;
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
      const response = await fetch('/api/career-events');
      if (response.status === 401) {
        isAuthenticated = false;
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const data = await response.json();
      careerEvents = data.careerEvents;
      isAuthenticated = true;
      
      csrfToken = getCookie(CSRF_COOKIE_NAME);
    } catch (err) {
      if (err instanceof Error) {
        error = "An error occurred while loading data";
        console.error('Error loading career events:', err);
      }
    }
  }
  
  // Helper function to get a cookie value
  function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }

  async function handleLogin(event: CustomEvent<{ password: string }>) {
    const enteredPassword = event.detail.password;
    
    if (!enteredPassword.trim()) {
      authError = "Password is required";
      return;
    }
    
    // Simple client-side throttling
    const now = Date.now();
    if (loginAttempts >= MAX_CLIENT_ATTEMPTS && now - lastAttemptTime < 60000) {
      authError = "Too many attempts. Please wait before trying again.";
      return;
    }
    
    lastAttemptTime = now;
    loginAttempts++;
    
    try {
      isAuthenticating = true;
      authError = null;
      
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: enteredPassword }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        authError = "Authentication failed";
        return;
      }
      
      // Store the CSRF token if provided
      if (data.csrfToken) {
        csrfToken = data.csrfToken;
      }
      
      // Reset login attempts on success
      loginAttempts = 0;
      
      // Successfully authenticated, now fetch career events
      isAuthenticated = true;
      password = ""; // Clear password from memory
      
      // Fetch career data
      await checkAuthentication();
    } catch (err) {
      if (err instanceof Error) {
        authError = "Authentication error occurred";
        console.error('Login error:', err);
      }
    } finally {
      isAuthenticating = false;
    }
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
      bind:password
      {isAuthenticating}
      {authError}
      on:login={handleLogin}
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