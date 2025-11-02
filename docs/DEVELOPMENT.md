# Development Guide

This document provides detailed information for developers working on the Scheduler application.

## Architecture Overview

The Scheduler is built as a full-stack Next.js application with the following architecture:

- **Frontend**: Next.js 14+ with App Router, React Server Components
- **Backend**: Next.js API Routes and Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: TailwindCSS with CSS variables for theming
- **Type Safety**: TypeScript throughout the stack
- **Testing**: Jest + React Testing Library

## Project Structure

```
scheduler/
├── src/
│   ├── app/              # Next.js app router (pages & layouts)
│   │   ├── layout.tsx    # Root layout with theme provider
│   │   └── page.tsx      # Home page
│   ├── components/       # React components
│   │   └── theme-toggle.tsx
│   ├── lib/              # Utilities and shared code
│   │   ├── prisma.ts     # Prisma client singleton
│   │   ├── theme-provider.tsx
│   │   ├── utils.ts      # Utility functions
│   │   └── validations.ts # Zod schemas
│   ├── styles/           # Global styles
│   │   └── globals.css   # Theme variables & base styles
│   └── types/            # TypeScript type definitions
│       └── index.ts
├── prisma/
│   └── schema.prisma     # Database schema
├── docs/                 # Documentation
│   └── DEVELOPMENT.md    # This file
└── tests/                # Test files
```

## Database Schema

See `prisma/schema.prisma` for the complete database schema. Key models include:

- **User**: Staff, managers, and super admins with role-based permissions
- **Venue**: Locations with configuration for scheduling
- **Shift**: Individual shifts with staffing requirements
- **ShiftAssignment**: User-shift mappings with role and tip data
- **Override**: Special permission system with dual confirmation
- **Availability**: User availability by month
- **ShiftTrade**: Staff-initiated shift trades requiring manager approval
- **Notification**: In-app and email notifications

## Theme System

The application supports light, dark, and system-preference themes:

### CSS Variables

Theme colors are defined using CSS variables in `src/styles/globals.css`:

```css
:root {
  --color-background: 255 255 255;
  --color-foreground: 15 23 42;
  /* ... more colors */
}

.dark {
  --color-background: 15 23 42;
  --color-foreground: 241 245 249;
  /* ... more colors */
}
```

### Theme Provider

The `ThemeProvider` component manages theme state and persistence:

- Detects system preference via `prefers-color-scheme`
- Stores user preference in localStorage
- Updates DOM classes dynamically
- Provides `useTheme` hook for components

### Accessibility

The theme system ensures:

- WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Keyboard navigation support
- Focus visible styles
- Motion reduction support via `prefers-reduced-motion`

## Key Features Implementation

### 1. Role-Based Access Control (RBAC)

Roles are defined in the Prisma schema:

- `SUPER_ADMIN`: Full system access
- `MANAGER`: Venue management and scheduling
- `BARTENDER`: Staff with bartending permissions
- `BARBACK`: Support staff

### 2. Override System

Overrides allow violations of normal rules with dual confirmation:

1. Manager creates override with reason
2. Both manager and affected user must approve
3. System maintains immutable audit trail
4. UI displays badges for pending/active overrides

### 3. Shift Trading

Staff can propose shift trades:

1. Staff A proposes trade to Staff B
2. Staff B accepts or declines
3. Manager reviews and approves
4. System validates roles, leads, and conflicts

### 4. Availability Management

Monthly availability with deadline enforcement:

- Venue-specific deadline (e.g., 10th of month)
- Default availability patterns (optional)
- Auto-submit on deadline (opt-in)
- Manager override for post-deadline edits

### 5. Validation & Error Handling

Each validation error includes:

- Clear error message
- Specific field/context
- **Suggested resolution** (required per system prompt)

Example:

```typescript
{
  field: "shift.leads",
  message: "Not enough lead staff assigned",
  suggestion: "Add a lead staff member, adjust lead requirements, or select a staff member with lead status",
  violationType: "lead_shortage"
}
```

## API Design

### Server Actions

Next.js Server Actions provide type-safe API endpoints:

```typescript
// Example: src/app/actions/shifts.ts
'use server';

import { prisma } from '@/lib/prisma';
import { shiftCreateSchema } from '@/lib/validations';

export async function createShift(input: unknown) {
  const validated = shiftCreateSchema.parse(input);
  // ... business logic
  return await prisma.shift.create({ data: validated });
}
```

### Validation

All inputs are validated using Zod schemas (see `src/lib/validations.ts`):

```typescript
const result = shiftCreateSchema.safeParse(input);
if (!result.success) {
  return { errors: result.error.flatten() };
}
```

## Testing Strategy

### Unit Tests

Test individual functions and components:

```typescript
// Example: src/lib/__tests__/utils.test.ts
import { formatTime12Hour } from '../utils';

describe('formatTime12Hour', () => {
  it('formats morning times correctly', () => {
    expect(formatTime12Hour('09:30')).toBe('9:30 AM');
  });
});
```

### Integration Tests

Test API routes and database operations:

```typescript
// Example: tests/api/shifts.test.ts
describe('Shift API', () => {
  it('creates a shift with valid data', async () => {
    const shift = await createShift({
      venueId: 'venue-1',
      date: new Date(),
      startTime: '18:00',
      endTime: '02:00',
      bartendersRequired: 2,
    });
    expect(shift).toBeDefined();
  });
});
```

## Git Workflow

Per the system prompt, commits follow this pattern:

1. Complete a task from `todo.md`
2. Run tests, lints, and build checks
3. Only commit if everything passes
4. Update `todo.md` (mark `[x]`, add to Done section)
5. Commit entire app with descriptive message:
   ```bash
   git add -A
   git commit -m "feat: complete user profiles with day job settings"
   git push
   ```

### Commit Message Format

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation only
- `test:` - Adding tests
- `chore:` - Maintenance tasks
- `style:` - Formatting, missing semicolons, etc.

## Common Tasks

### Adding a New Feature

1. Check `todo.md` for the task
2. Create necessary files (components, API routes, etc.)
3. Implement with type safety and validation
4. Add tests
5. Update documentation if needed
6. Run lint and tests
7. Update `todo.md` and commit

### Database Changes

1. Update `prisma/schema.prisma`
2. Generate migration: `npm run db:migrate`
3. Generate Prisma client: `npm run db:generate`
4. Update types in `src/types/index.ts`
5. Update validation schemas in `src/lib/validations.ts`

### Adding a New Page

1. Create file in `src/app/[route]/page.tsx`
2. Use layout for theme support
3. Follow accessibility guidelines
4. Add responsive design
5. Test on mobile and desktop

## Performance Best Practices

- Use React Server Components for non-interactive content
- Implement pagination for large data sets
- Use database indexes (defined in Prisma schema)
- Optimize images with Next.js Image component
- Lazy load heavy components
- Use debouncing for search inputs

## Accessibility Guidelines

All components must follow WCAG AA standards:

- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus visible styles
- Sufficient color contrast
- Text alternatives for images
- Form validation feedback
- Motion reduction support

## Security Considerations

- Input validation on all API routes
- SQL injection prevention (Prisma ORM)
- XSS prevention (React's built-in escaping)
- CSRF protection (Next.js built-in)
- Role-based authorization checks
- Audit logging for sensitive operations
- Secure password hashing (when auth is implemented)

## Troubleshooting

### Database Connection Issues

1. Check `DATABASE_URL` in `.env`
2. Ensure PostgreSQL is running
3. Verify database exists and user has permissions
4. Run `npm run db:push` to sync schema

### Build Errors

1. Clear Next.js cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check TypeScript errors: `npx tsc --noEmit`
4. Run linter: `npm run lint`

### Theme Not Switching

1. Check localStorage for `scheduler-theme` key
2. Verify ThemeProvider is wrapping app
3. Check browser console for errors
4. Clear browser cache

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
