<script lang="ts">
  import { onMount } from 'svelte';
  import type { CareerEvent } from "$lib/types";
  
  export let event: CareerEvent;
  export let isSelected: boolean;
  export let position: number;
  export let selectedEventId: number | null;
  export let onSelect: (id: number) => void;
  export let onClose: () => void;
  export let elementRef: Map<number, HTMLElement>;
  
  let element: HTMLElement;
  
  onMount(() => {
    if (element) {
      elementRef.set(event.id, element);
    }
    
    return () => {
      elementRef.delete(event.id);
    };
  });
</script>

<div
  class="timeline-item"
  class:selected={isSelected}
  on:click={() => onSelect(event.id)}
  on:keydown={(e) => e.key === "Enter" && onSelect(event.id)}
  tabindex={selectedEventId === null || Math.abs(position) <= 1 ? 0 : -1}
  role="button"
  aria-label="View details for {event.title} at {event.company}"
  bind:this={element}
>
  <div class="timeline-content">
    <div class="timeline-date">{event.period}</div>
    <h2>{event.title}</h2>
    <h3>{event.company}</h3>

    <p class="event-description" class:selected={isSelected}>
        {event.description}
    </p>
    
    {#if isSelected}
      <button class="close-button" on:click|stopPropagation={onClose}>
        <span class="close-icon">×</span>
      </button>
    {/if}
  </div>
</div>

<style>
  .timeline-item {
    --dot-size: 16px;
    --dot-size-selected: 24px;
    --dot-position: 41px;
    --highlight-color: 62, 132, 255;
    --highlight-shadow: rgba(var(--highlight-color), 0.8);
    --transition: all 1s cubic-bezier(0.19, 1, 0.22, 1);
    
    position: relative;
    transition: var(--transition);
    margin-bottom: 2em;
    padding-left: 80px;
    cursor: pointer;
    transform-origin: left center;
    will-change: transform, margin, opacity;
  }

  .timeline-item::before {
    content: "";
    position: absolute;
    left: var(--dot-position);
    top: 26px;
    width: var(--dot-size);
    height: var(--dot-size);
    border: 2px solid var(--primary);
    border-radius: 50%;
    background-color: var(--background);
    transition: var(--transition);
    box-shadow: 0 0 0 0 var(--highlight-shadow);
    transform-origin: center;
    will-change: width, height, left, top, background-color, border-color, transform, box-shadow;
  }

  .timeline-item:hover:not(.selected)::before {
    box-shadow: 0 0 0 6px rgba(62, 132, 255, 0.2);
  }

  .timeline-content {
    background-color: var(--surface);
    border-radius: 8px;
    padding: 1.8em;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.07);
    transition: var(--transition);
    position: relative;
    overflow: hidden;
    border-left: 4px solid var(--surface);
  }

  .timeline-content:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 0%;
    height: 3px;
    transition: width 0.2s ease-in-out;
    background: linear-gradient(90deg, var(--primary), var(--primary-dark));
  }

  .timeline-item:hover .timeline-content:before {
    width: 100%;
  }

  .timeline-item.selected {
    z-index: 10;
    opacity: 1;
    transition: var(--transition);
  }

  .timeline-item.selected .timeline-content {
    box-shadow:
      0 15px 35px rgba(0, 0, 0, 0.1),
      0 5px 15px rgba(0, 0, 0, 0.07);
    background-color: var(--background);
    border-left: 4px solid var(--primary);
  }

  .timeline-item.selected h3 {
    margin-bottom: 2em;
  }

  .timeline-item.selected::before {
    width: var(--dot-size-selected);
    height: var(--dot-size-selected);
    left: calc(var(--dot-position) - 4px);
    top: 23px;
    background-color: var(--primary);
    border-color: var(--background);
    box-shadow: 0 0 0 8px rgba(62, 132, 255, 0.3);
    animation: pulse 2s infinite;
  }

  .timeline-date {
    font-weight: bold;
    color: var(--primary);
    margin-bottom: 1em;
    letter-spacing: 0.5px;
    font-size: 0.95em;
    text-transform: uppercase;
    opacity: 1;
  }

  h2 {
    margin: 0;
    font-size: 1.5em;
    font-weight: 600;
    opacity: 1;
    color: var(--text);
  }

  h3 {
    margin: 0 0 1em 0;
    font-size: 1.1em;
    color: var(--text-light);
    font-weight: normal;
    margin-bottom: 0;
    opacity: 1;
    margin-bottom: 0.75em;
    transform: translateY(10px);
  }

  .event-description {
    margin: 0;
    line-height: 1.6;
    opacity: 0;
    max-height: 0;
    overflow: hidden;
    font-size: 1.1em;
    transition: var(--transition);
    color: var(--text);
    margin-bottom: 0;
  }

  .timeline-item.selected .event-description {
    max-height: 700px;
    opacity: 1;
    overflow: visible;
  }

  .close-button {
    position: absolute;
    top: 15px;
    right: 15px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background-color: transparent;
    color: var(--text-light);
    font-size: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    overflow: hidden;
  }

  .close-button:hover {
    background-color: rgba(62, 132, 255, 0.1);
    color: var(--primary);
    transform: rotate(90deg);
  }

  .close-icon {
    display: flex;
    justify-content: center;
    height: 100%;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 var(--highlight-shadow);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(var(--highlight-color), 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(var(--highlight-color), 0);
    }
  }

  @media (max-width: 640px) {
    .timeline-item {
      padding-left: 30px;
      margin-bottom: 1.5em;
    }

    .timeline-item::before {
      left: 8px;
      top: 20px;
      width: 12px;
      height: 12px;
    }

    .timeline-content {
      padding: 1.2em;
    }

    .timeline-date {
      font-size: 0.8em;
    }

    h2 {
      font-size: 1.2em;
    }

    h3 {
      font-size: 0.9em;
    }

    .event-description {
      font-size: 0.9em;
    }
  }
</style>