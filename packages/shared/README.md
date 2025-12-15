# @divergent-teams/shared

Shared types and utilities used across the app and Firebase functions.

## Usage

### In the app (packages/app)

```typescript
import { User, Team, formatDate } from '@divergent-teams/shared';

const user: User = {
  id: '123',
  email: 'user@example.com',
  displayName: 'John Doe'
};

const formattedDate = formatDate(new Date());
```

### In functions (packages/functions)

```typescript
import { User, Team } from '@divergent-teams/shared';

export const createUser = functions.https.onCall((data) => {
  const user: User = {
    id: data.id,
    email: data.email,
    displayName: data.displayName
  };
  // ...
});
```

## Adding new shared code

1. Add your types/utilities to `src/` directory
2. Export them from `src/index.ts`
3. They'll automatically be available in both app and functions

No build step required for simple types and utilities!
