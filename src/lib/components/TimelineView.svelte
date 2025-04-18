<script lang="ts">
  import type { CareerEvent } from "$lib/types";
  import TimelineItem from "$lib/components/TimelineItem.svelte";
  import { onMount } from "svelte";
  
  export let careerEvents: CareerEvent[];
  export let selectedEventId: number | null = null;
  export let onSelect: (id: number) => void;
  export let onClose: () => void;
  
  let timelineItemRefs = new Map();
  
  export function scrollSelectedIntoView() {
    if (selectedEventId === null) return;
    
    const selectedElement = timelineItemRefs.get(selectedEventId);
    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }
</script>

<div class="timeline-container">
  {#each careerEvents as event}
    {@const isSelected =
      selectedEventId !== null && event.id === selectedEventId}
    {@const currentIndex =
      selectedEventId !== null
        ? careerEvents.findIndex((e) => e.id === selectedEventId)
        : -1}
    {@const eventIndex = careerEvents.findIndex((e) => e.id === event.id)}
    {@const position = selectedEventId !== null ? eventIndex - currentIndex : 0}

    <TimelineItem
      {event}
      {isSelected}
      {position}
      {selectedEventId}
      {onSelect}
      {onClose}
      bind:elementRef={timelineItemRefs}
    />
  {/each}
</div>

<style>
  .timeline-container {
    position: relative;
    padding: 2em 0;
    height: auto;
    min-height: 80vh;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  .timeline-container::before {
    content: "";
    position: absolute;
    top: 0;
    left: 50px;
    width: 2px;
    height: 100%;
    background: linear-gradient(
      to bottom,
      rgba(62, 132, 255, 0.2),
      var(--primary),
      rgba(62, 132, 255, 0.2)
    );
    transform: scaleY(0);
    transform-origin: top;
    animation: timeline-appear 1s cubic-bezier(0.19, 1, 0.22, 1) forwards;
    opacity: 0.8;
  }

  @keyframes timeline-appear {
    0% {
      transform: scaleY(0);
    }
    100% {
      transform: scaleY(1);
    }
  }
  
  @media (max-width: 640px) {
    .timeline-container::before {
      left: 20px;
    }
  }
</style>
