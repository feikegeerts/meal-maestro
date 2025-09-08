# Drag & Drop Implementation Guide

This document explains how our drag and drop implementation works using `@dnd-kit`, why certain design decisions were made, and how to troubleshoot common issues.

## Overview

Our drag and drop system uses `@dnd-kit` to provide smooth, accessible reordering with live visual feedback. The implementation prioritizes:

- **Live reordering**: Items visually move into position during drag operations
- **Smooth animations**: CSS transforms with custom easing for polished feel
- **Accessibility**: Full keyboard navigation support
- **Performance**: Minimal DOM manipulations during drag operations

## Core Implementation (`drag-test.tsx`)

### 1. Essential Imports

```tsx
import {
  DndContext,          // Root context provider
  closestCenter,       // Collision detection algorithm
  KeyboardSensor,      // Keyboard accessibility
  PointerSensor,       // Mouse/touch input
  useSensor,           // Sensor configuration
  useSensors,          // Multiple sensor management
  DragEndEvent,        // Type for drag completion
} from '@dnd-kit/core';

import {
  arrayMove,                    // Utility for reordering arrays
  SortableContext,             // Context for sortable items
  sortableKeyboardCoordinates, // Keyboard navigation logic
  verticalListSortingStrategy, // Optimization for vertical lists
  useSortable,                 // Hook for individual sortable items
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities'; // Transform utilities
```

### 2. SortableItem Component

```tsx
function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,    // Accessibility attributes
    listeners,     // Event handlers for drag initiation
    setNodeRef,    // Ref callback for DOM node
    transform,     // CSS transform object for positioning
    transition,    // CSS transition for animations
    isDragging,    // Boolean state for drag feedback
  } = useSortable({ 
    id,
    transition: {
      duration: 150,                           // Animation duration in ms
      easing: "cubic-bezier(0.25, 1, 0.5, 1)", // Smooth easing curve
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform), // Convert to CSS string
    transition,                                   // Apply transition
    opacity: isDragging ? 0.5 : 1,              // Visual feedback
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
```

### 3. Main Component Structure

```tsx
export default function DragTestPage() {
  const [items, setItems] = useState(["1", "2", "3", "4", "5"]);

  // Configure input sensors
  const sensors = useSensors(
    useSensor(PointerSensor),     // Mouse and touch
    useSensor(KeyboardSensor, {   // Keyboard navigation
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag completion
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-6 max-w-md">
          {items.map((id) => (
            <SortableItem key={id} id={id}>
              <div className="p-4 bg-white dark:bg-gray-800 border rounded-lg shadow cursor-move hover:shadow-md transition-shadow">
                Item {id}
              </div>
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

## Key Technical Decisions

### 1. Layout: Flexbox with Gap

**Why `flex flex-col gap-6` instead of `space-y-*`?**

```tsx
// ❌ DON'T: Tailwind space-y utilities interfere with transforms
<div className="space-y-6">
  {/* Transform animations break spacing */}
</div>

// ✅ DO: Flexbox gap respects transforms and animations
<div className="flex flex-col gap-6">
  {/* Consistent spacing during animations */}
</div>
```

**Reason**: CSS transforms move elements without affecting document flow. Tailwind's `space-y-*` uses margin which doesn't account for transformed positions, causing visual overlaps. Flexbox `gap` maintains consistent spacing regardless of transforms.

### 2. Animation Configuration

```tsx
transition: {
  duration: 150,                           // Fast enough to feel responsive
  easing: "cubic-bezier(0.25, 1, 0.5, 1)", // Smooth acceleration/deceleration
}
```

**Why these values?**
- **150ms duration**: Short enough to feel instant, long enough to be visually smooth
- **cubic-bezier easing**: Creates natural motion that accelerates quickly and decelerates smoothly

### 3. Collision Detection: `closestCenter`

```tsx
collisionDetection={closestCenter}
```

**Why `closestCenter` over `pointerWithin`?**
- **closestCenter**: Uses geometric center of dragged item vs drop targets
- **pointerWithin**: Uses cursor position within drop target boundaries

For vertical lists, `closestCenter` provides more predictable behavior and works better with live reordering animations.

### 4. No DragOverlay for Live Reordering

**Why skip DragOverlay when live reordering is enabled?**

```tsx
// When items move during drag, overlay becomes redundant
// User sees the actual item moving, not a preview
```

Live reordering provides superior UX because:
- Users see real-time feedback of where items will land
- No visual disconnect between drag preview and final position
- Feels more intuitive and direct

## How Live Reordering Works

### 1. Transform Calculation

During drag operations, `@dnd-kit` calculates transform values for each item:

```tsx
// Example transform values during drag:
Item 1: { x: 0, y: 0 }      // No movement
Item 2: { x: 0, y: -72 }    // Moves up to fill Item 1's space
Item 3: { x: 0, y: -72 }    // Moves up to fill Item 2's space
Item 4: { x: 0, y: 120 }    // Being dragged, moves down
```

### 2. CSS Transform Application

```tsx
const style = {
  transform: CSS.Transform.toString(transform), // "translateX(0px) translateY(-72px)"
  transition,                                   // Smooth animation between positions
  opacity: isDragging ? 0.5 : 1,              // Visual feedback for dragged item
};
```

### 3. Animation Timing

```
Drag Start → Transform Calculation → CSS Animation → Visual Movement
    ↓              ↓                      ↓              ↓
  0ms            ~16ms                   150ms        Complete
```

## Troubleshooting Common Issues

### 1. Items Not Spacing Properly

**Problem**: Items overlap or have inconsistent spacing during drag

**Solution**: Use flexbox with gap instead of margin-based spacing

```tsx
// ❌ Problematic
<div className="space-y-4">          // Margin-based spacing
<div className="mb-4">               // Individual margins

// ✅ Correct
<div className="flex flex-col gap-4"> // Flexbox gap
```

### 2. No Live Reordering

**Problem**: Items only reorder on drop, not during drag

**Checklist**:
- ✅ Using `useSortable` hook correctly
- ✅ Applying `transform` and `transition` styles
- ✅ Layout doesn't interfere with transforms
- ✅ CSS transitions are enabled

### 3. Jumpy Animations

**Problem**: Items move abruptly instead of smoothly

**Solution**: Check transition configuration

```tsx
// ✅ Smooth transitions
transition: {
  duration: 150,
  easing: "cubic-bezier(0.25, 1, 0.5, 1)",
}
```

### 4. Drag Handle Not Working

**Problem**: Items can't be dragged or drag is unreliable

**Solution**: Ensure proper listener application

```tsx
// ✅ Apply to entire item or specific handle
<div ref={setNodeRef} {...attributes} {...listeners}>
  {children}
</div>

// Or for specific handle:
<div ref={setNodeRef} {...attributes}>
  <div {...listeners}>⋮⋮</div> {/* Drag handle */}
  {children}
</div>
```

## Performance Considerations

### 1. Avoid Expensive Operations During Drag

```tsx
// ❌ Don't recalculate expensive values during drag
const expensiveValue = useMemo(() => 
  items.map(item => heavyCalculation(item))
, [items]); // Recalculates on every drag

// ✅ Calculate once, reference during drag
const itemData = useMemo(() => 
  items.map(item => ({ id: item.id, ...heavyCalculation(item) }))
, [items]);
```

### 2. Minimize DOM Queries

`@dnd-kit` handles DOM measurements efficiently, but avoid additional DOM queries during drag operations.

### 3. Use Appropriate Collision Detection

- `closestCenter`: Best for most use cases, good performance
- `closestCorners`: More precise but slightly more expensive
- `pointerWithin`: Cheapest but can feel less intuitive

## Integration Patterns

### 1. With Form State

```tsx
const [ingredients, setIngredients] = useState(initialIngredients);

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  
  if (over && active.id !== over.id) {
    setIngredients((items) => {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }
}
```

### 2. With Complex Data Structures

```tsx
interface Ingredient {
  id: string;
  amount: number;
  unit: string;
  ingredient: string;
}

// Use stable IDs for drag operations
const itemIds = ingredients.map(ing => ing.id);

<SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
  {ingredients.map((ingredient) => (
    <SortableIngredient key={ingredient.id} ingredient={ingredient} />
  ))}
</SortableContext>
```

## Accessibility Features

`@dnd-kit` provides comprehensive accessibility support:

- **Keyboard Navigation**: Arrow keys to navigate, Space/Enter to pick up/drop
- **Screen Reader Support**: Announces drag operations and position changes
- **Focus Management**: Maintains focus during drag operations
- **ARIA Attributes**: Automatically applied via `{...attributes}`

## Next Steps

To apply this implementation to the ingredient input:

1. Replace current drag logic with this pattern
2. Adapt `SortableItem` for ingredient structure
3. Update CSS classes to match existing design
4. Test with complex ingredient data
5. Ensure form integration works correctly

This implementation provides the foundation for smooth, accessible drag and drop that works consistently across desktop and mobile devices.

## Update: Critical Architecture Fix

⚠️ **Important**: The initial implementation had a critical flaw where both desktop and mobile components rendered simultaneously in the DOM (hidden with CSS). This caused dnd-kit collision detection issues and prevented live reordering.

**Solution**: Use JavaScript conditional rendering instead of CSS hiding to ensure only ONE component exists in the DOM at any time.

See `/docs/drag-drop-solution.md` for the complete fix that enables live reordering.