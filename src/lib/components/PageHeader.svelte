<script>
  export let title = '';
  export let subtitle = '';
</script>

<header>
  <h1 class="title">{title}</h1>
  <p class="subtitle">{subtitle}</p>
</header>

<style>
  header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .title {
    font-size: 2.5em;
    color: var(--primary);
    margin-bottom: 0.5em;
    font-weight: 700;
  }

  .subtitle {
    font-size: 1.2em;
    color: var(--text-light);
    margin-bottom: 0;
  }

  /* Mobile Responsiveness */
  @media (max-width: 768px) {
    .title {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1rem;
    }
  }
</style>
