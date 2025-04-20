<script>
  export let profileUrl = "https://www.linkedin.com/in/feike-geerts-b1101634/";
</script>

<button 
  aria-label="View LinkedIn Profile" 
  class="linkedin-button" 
  on:click={() => window.open(profileUrl, '_blank')}
>
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 11.268h-3v-5.604c0-1.337-.026-3.063-1.867-3.063-1.869 0-2.155 1.459-2.155 2.967v5.7h-3v-10h2.881v1.367h.041c.401-.761 1.379-1.563 2.841-1.563 3.038 0 3.6 2.001 3.6 4.604v5.592z"/>
  </svg>
</button>

<style>
  .linkedin-button {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    position: fixed;
    bottom: 140px; 
    right: 20px;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .linkedin-button:hover {
    transform: scale(1.05);
    background: var(--primary);
    color: white;
  }
  @media (max-width: 768px) {
  .linkedin-button {
      bottom: 120px; 
  }
}
</style>