<script>
    import '../app.css'; 
    import { onMount } from 'svelte';
    import ThemeToggle from '$lib/components/ThemeToggle.svelte';
    
    let currentTheme = 'light';
    
    onMount(() => {
      const savedTheme = localStorage.getItem('theme');
      
      if (savedTheme) {
        currentTheme = savedTheme;
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        currentTheme = 'dark';
      }
      
      document.documentElement.setAttribute('data-theme', currentTheme);
    });
</script>
  
<slot />
<ThemeToggle bind:theme={currentTheme} />
