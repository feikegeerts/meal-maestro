# Component Development Guidelines

## UI Framework

### Tailwind CSS 4

- Use **Tailwind 4** utility classes for all styling
- Mobile-first responsive design with `sm:`, `md:`, `lg:`, `xl:` breakpoints
- Dark mode support with `dark:` prefix
- Prefer utilities over custom CSS

### shadcn-svelte

- Use **shadcn-svelte** components as building blocks (located in `ui/` folder)
- Available components: Button, Input, Card, Dialog, Badge, Avatar
- Components are accessible and customizable with Tailwind

## Development Patterns

### Svelte 5 Syntax

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';

  interface Props {
    title: string;
    variant?: 'primary' | 'secondary';
  }

  let { title, variant = 'primary' }: Props = $props();
</script>

<Button {variant} class="w-full">{title}</Button>
```

### Component Structure

1. **Imports and types** at top of script
2. **Props with TypeScript interfaces**
3. **Template with Tailwind classes**
4. **Custom styles only when necessary**

## Best Practices

- Always use TypeScript interfaces for props
- Follow mobile-first responsive design
- Implement dark mode variants
- Use semantic HTML with proper ARIA labels
- Test across different screen sizes

## Migration Notes

When updating existing components:

- first check if there is a shadcn-svelte component that can replace the custom one
- Replace custom CSS with Tailwind utilities
- Use shadcn-svelte base components as much as possible
- Maintain existing component APIs to avoid breaking changes
