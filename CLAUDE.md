# Divergent Teams

This application is built with **Rask UI**, a lightweight reactive component library that uses observable state management with virtual DOM reconciliation.

## About Rask UI

Rask is an alternative to React that eliminates common pain points like stale closures, dependency arrays, and unnecessary complexity through its reactive state approach.

**Documentation**: https://rask-ui.io

## Component Pattern

Rask components use a distinctive **two-scope pattern**:

### Setup Scope (runs once)
The main component function body executes once during initialization. This is where you:
- Initialize reactive state with `useState()`
- Set up hooks (`useEffect()`, `useMountEffect()`, etc.)
- Declare variables that persist across renders
- Define event handlers

### Render Scope (runs on updates)
The component returns a function that re-executes whenever reactive dependencies change:

```typescript
export function MyComponent() {
  // SETUP SCOPE - runs once
  const state = useState({ count: 0 });
  let persistentVar = false; // Persists across renders!

  const handleClick = () => {
    state.count++; // Triggers re-render
  };

  // RENDER SCOPE - runs on each render
  return () => (
    <div>
      <h1>Count: {state.count}</h1>
      <button onClick={handleClick}>Increment</button>
    </div>
  );
}
```

## Key Differences from React

1. **No stale closures**: Variables in setup scope persist and always have current values
2. **No dependency arrays**: State updates automatically trigger re-renders
3. **Direct state mutation**: Use `state.property = value` instead of `setState()`
4. **Consistent return pattern**: Components must return functions that return JSX

## Important Patterns

### State Management
```typescript
const state = useState({
  user: null,
  loading: false
});

// Direct mutation triggers re-render
state.loading = true;
state.user = { name: 'John' };
```

### Effects
```typescript
// Runs once on mount
useMountEffect(() => {
  console.log('Component mounted');
});

// Runs when dependencies change
useEffect(() => {
  console.log('Count changed:', state.count);
});
```

### Refs
```typescript
const elementRef = useRef<HTMLDivElement>();

return () => (
  <div ref={elementRef}>
    Content
  </div>
);
```

## Project Structure

- **src/components/** - Rask UI components
- **src/contexts/** - Reactive context providers
- **src/App.tsx** - Main application component

## Common Pitfalls

1. **Inconsistent returns**: Both editing and non-editing modes must return functions:
   ```typescript
   // ❌ Wrong
   if (editing) {
     return <div>...</div>; // Direct JSX
   }
   return () => <div>...</div>; // Function

   // ✅ Correct
   if (editing) {
     return () => <div>...</div>; // Function
   }
   return () => <div>...</div>; // Function
   ```

2. **Event propagation**: Remember to stop propagation when needed:
   ```typescript
   const handleClick = (e: Rask.MouseEvent) => {
     e.stopPropagation(); // Prevent bubbling
     // Handle click
   };
   ```

3. **Variable scope**: Variables in setup scope persist - don't treat them like React state!
