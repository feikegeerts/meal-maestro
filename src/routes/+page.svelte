<script lang="ts">
  // Simple homepage with navigation
</script>

<main>

  <div class="welcome-content">
    <h1>Welcome</h1>
    <p>Welcome to my personal site. View my <a href="/career">career timeline</a> to see my professional experience.</p>
  </div>
</main>

<style>
  main {
    padding: 2em;
    max-width: 1000px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  }

  .welcome-content {
    text-align: center;
    margin-top: 5em;
  }

  h1 {
    color: var(--primary, #333);
    font-size: 2.5em;
    margin-bottom: 0.5em;
  }
</style>
