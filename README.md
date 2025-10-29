# Scheduler

A multi-venue scheduling system with role-based permissions, shift management, availability tracking, and comprehensive reporting.

## Features

- **Multi-venue scheduling** with networked and external venue support
- **Role-based access control** (Super Admin, Manager, Staff)
- **Shift management** with bartender, barback, and lead requirements
- **Override system** with dual confirmation and audit trails
- **Shift trading** with manager approval
- **Availability management** with deadline enforcement
- **External schedule imports** (CSV/JSON)
- **Reporting** for equity tracking and compliance
- **Optional tip pool** management
- **Notifications** (push + email with quiet hours)
- **Theme support** (light/dark with system preference detection)
- **Mobile-first** staff experience, **desktop-first** management tools
- **WCAG AA accessibility** compliance

## Tech Stack

- **Frontend/Backend**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Styling**: TailwindCSS with CSS variables for theming
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint + Prettier
- **CI/CD**: GitHub Actions

## Development

```bash
# Install dependencies
npm install

# Set up database
npm run db:setup

# Run development server
npm run dev

# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format
```

## Project Structure

```
scheduler/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities and helpers
│   ├── styles/           # Global styles and theme
│   └── types/            # TypeScript type definitions
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
├── tests/                # Test files
└── docs/                 # Documentation
```

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and configure
3. Install dependencies: `npm install` (this will also set up pre-commit hooks)
4. Set up database: `npm run db:setup`
5. Run development server: `npm run dev`
6. Visit `http://localhost:3000`

### Pre-commit Hooks

The project uses Husky and lint-staged to run linting and formatting checks before commits. This ensures code quality and consistency. The hooks are automatically installed when you run `npm install`.

### CI/CD

GitHub Actions workflows automatically run on push and pull requests:
- **CI**: Runs linting, tests, and builds
- **Deploy**: Configured for your deployment provider (requires setup)

## License

Proprietary

