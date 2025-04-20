<script>
  import { onMount } from 'svelte';
  let isAnimating = false;

  onMount(() => {
    isAnimating = true;
  });
</script>

<main>
  <header>
    <h1 class="title">Meal Maestro</h1>
    <p class="subtitle">What's for dinner? Your guide to inspired meals and smart planning.</p>
  </header>

  <section class="construction">
    <p class="message">This page is under construction.</p>
    <div class="construction-animation" class:animate={isAnimating}>
      <div class="block block1"></div>
      <div class="block block2"></div>
      <div class="block block3"></div>
      <div class="block block4"></div>
    </div>
  </section>
</main>

<style>
  main {
    padding: 2em;
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  }

  .title {
    font-size: 2.5em;
    color: var(--primary);
    margin-bottom: 0.5em;
  }

  .subtitle {
    font-size: 1.2em;
    color: var(--text-secondary);
    margin-bottom: 2em;
  }

  .construction {
    margin-top: 3em;
  }

  .message {
    font-size: 1.5em;
    color: var(--text-primary);
    margin-bottom: 1.5em;
  }

  .construction-animation {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    height: 100px;
    margin: 0 auto;
    width: 180px;
  }

  .block {
    width: 30px;
    background-color: var(--primary);
    margin: 0 5px;
    border-radius: 4px 4px 0 0;
    opacity: 0.8;
    transform: translateY(100%);
    animation-duration: 1.5s;
    animation-iteration-count: infinite;
    animation-timing-function: ease-in-out;
  }

  .block1 {
    height: 60px;
    animation-name: block1;
    animation-delay: 0s;
  }

  .block2 {
    height: 80px;
    animation-name: block2;
    animation-delay: 0.2s;
  }

  .block3 {
    height: 50px;
    animation-name: block3;
    animation-delay: 0.4s;
  }

  .block4 {
    height: 70px;
    animation-name: block4;
    animation-delay: 0.6s;
  }

  @keyframes block1 {
    0%, 100% { transform: translateY(100%); }
    50% { transform: translateY(0); }
  }

  @keyframes block2 {
    0%, 100% { transform: translateY(100%); }
    50% { transform: translateY(0); }
  }

  @keyframes block3 {
    0%, 100% { transform: translateY(100%); }
    50% { transform: translateY(0); }
  }

  @keyframes block4 {
    0%, 100% { transform: translateY(100%); }
    50% { transform: translateY(0); }
  }

  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    main {
      color: #f8f8f8;
    }
    
    .title {
      color: var(--primary);
    }
    
    .subtitle {
      color: #bdbdbd;
    }
    
    .message {
      color: #e0e0e0;
    }
    
    .block {
      opacity: 1;
    }
  }
</style>