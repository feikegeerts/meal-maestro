<script>
  // No additional logic needed for this static homepage
</script>

<main>
  <header>
    <h1>Feike Geerts</h1>
    <p>My personal hub for everything useful</p>
  </header>

  <section class="tiles">
    <a href="https://homeassistant.feikegeerts.nl" class="tile home-assistant">
      <h2>Home Assistant</h2>
      <p>My Raspberry Pi-powered Home Assistant instance</p>
    </a>
    <a href="/career" class="tile career">
      <h2>Career</h2>
      <p>Explore my professional journey</p>
    </a>
    <a href="/meal-maestro" class="tile recipes">
      <h2>Meal Maestro</h2>
      <p>What’s for dinner?</p>
    </a>
  </section>
</main>

<style>
  main {
    padding: 2em;
    max-width: 1200px;
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

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2em;
  }

  .tile {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 2em;
    background: linear-gradient(135deg, #f5f5f5, #e0e0e0);
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    text-decoration: none;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .tile:hover {
    transform: translateY(-10px);
    box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2);
  }

  .tile h2 {
    font-size: 1.5em;
    margin-bottom: 0.5em;
  }

  .tile p {
    font-size: 1em;
    color: #666;
  }

  .home-assistant {
    background: linear-gradient(135deg, #4caf50, #81c784);
    color: white;
  }

  .career {
    background: linear-gradient(135deg, #2196f3, #64b5f6);
    color: white;
  }

  .recipes {
    background: linear-gradient(135deg, #ff9800, #ffb74d);
    color: white;
  }
</style>
