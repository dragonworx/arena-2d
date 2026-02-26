# Arena-2D Monorepo

A pnpm-based Turborepo monorepo for developing the Arena-2D graphics library and related packages.

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm 9.0.0+ (configured via `packageManager` in package.json)

### Installation

```bash
# Install all dependencies
pnpm install
```

## Monorepo Structure

```
arena-2d/
├── apps/
│   └── demo/                 # Demo web application
├── packages/
│   ├── arena-2d/             # Main library
│   ├── arena-geometry/        # Future: Geometry utilities
│   ├── arena-motion/          # Future: Motion/animation
│   ├── arena-player/          # Future: Playback system
│   ├── fantoccini-editor/     # Future: Editor tools
│   ├── fantoccini-player/     # Future: Player tools
│   ├── typescript-config/     # Shared TypeScript presets
│   └── biome-config/          # Shared Biome linting rules
├── pnpm-workspace.yaml        # pnpm workspace definition
├── turbo.json                 # Turborepo task pipeline
└── package.json               # Root workspace config
```

## Development Commands

All commands run via **Turborepo** for efficient parallel execution and caching.

### Building

```bash
# Build all packages
pnpm build

# Build a specific package
pnpm build --filter=@arena-2d/arena-2d

# Build with dependencies
pnpm build --filter=@arena-2d/demo...
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm test --filter=@arena-2d/arena-2d

# Run tests in watch mode (Bun-specific)
cd packages/arena-2d && bun test --watch
```

### Type Checking

```bash
# Check types across all packages
pnpm typecheck

# Check types for a specific package
pnpm typecheck --filter=@arena-2d/arena-2d
```

### Linting

```bash
# Check code style
pnpm lint

# Fix style issues
pnpm lint:fix

# Lint a specific package
pnpm lint --filter=@arena-2d/arena-2d
```

### Demo Development

```bash
# Start demo dev server (watches source for changes)
pnpm dev --filter=@arena-2d/demo

# Or from the demo directory
cd apps/demo && pnpm dev
```

The demo server runs on `http://localhost:3000` with live reload enabled.

### All Tasks

```bash
# Run all quality checks (build + test + lint + typecheck)
pnpm build && pnpm test && pnpm typecheck && pnpm lint
```

## Package Management

### Working with Workspace Packages

Install dependencies for the entire workspace:
```bash
pnpm install
```

Add a dependency to a specific package:
```bash
pnpm add lodash --filter=@arena-2d/arena-2d
```

Add a dev dependency:
```bash
pnpm add -D @types/node --filter=@arena-2d/arena-2d
```

Add a workspace package as a dependency:
```bash
# Add arena-2d library to demo app
pnpm add @arena-2d/arena-2d --filter=@arena-2d/demo
```

### Publishing Packages

*(When ready to publish)*

```bash
# Build all packages first
pnpm build

# Publish (requires npm account and auth)
pnpm publish --filter=@arena-2d/arena-2d
```

## Shared Configuration

### TypeScript Configuration

Packages extend from `@arena-2d/typescript-config`:

- **`base.json`** — Base compiler options (ESNext, bundler resolution, strict mode)
- **`library.json`** — Extends base with declaration generation for libraries

Each package's `tsconfig.json` extends one of these presets.

### Linting

All packages use the shared `@arena-2d/biome-config`. The root `biome.json` extends this config.

Configuration includes:
- Recommended rules enabled
- 2-space indentation
- Import organization enabled

## Turborepo Pipeline

Tasks are defined in `turbo.json`:

- **`build`** — Depends on `^build` (builds dependencies first), outputs `dist/**`
- **`test`** — Depends on `^build`, runs after libraries are built
- **`lint`** — No dependencies, runs independently
- **`typecheck`** — Depends on `^build`, type-checks compiled code
- **`dev`** — Persistent task with caching disabled (live reload)

Turborepo automatically:
- Parallelizes independent tasks
- Caches results based on file changes
- Skips tasks if outputs haven't changed
- Respects task dependencies

## File Locations

### Library Source & Tests

```
packages/arena-2d/
├── src/                   # Library source code
├── tests/                 # Test files (*.test.ts)
├── build.ts               # Bun build script
├── dist/                  # Compiled output
└── specs/                 # Specification documents
```

### Demo Files

```
apps/demo/
├── server.ts              # Dev server (entry point)
├── index.html             # HTML template
├── style.css              # Styles
├── panels/                # Interactive demo panels
└── dist/                  # Built bundle (from packages/arena-2d/dist)
```

## Build System

### Development Build

```bash
cd packages/arena-2d
bun build.ts
```

Outputs:
- `dist/arena-2d.js` — ES module bundle
- `dist/arena-2d.js.map` — Source map

### Type Definitions

Generated via `dts-bundle-generator` during build (for `@arena-2d/arena-2d` only).

## Filtering Tasks

Turborepo's `--filter` flag allows running tasks on specific packages:

```bash
# Run build only for arena-2d
pnpm build --filter=@arena-2d/arena-2d

# Run build for a package and its dependents
pnpm build --filter=@arena-2d/arena-2d...

# Run build for a package and its dependencies
pnpm build --filter=@arena-2d/demo...

# Run tests for all packages matching a pattern
pnpm test --filter="@arena-2d/*"
```

## Troubleshooting

### Dependencies Not Installed

Clear pnpm cache and reinstall:
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Turbo Cache Issues

Clear Turborepo cache:
```bash
rm -rf .turbo
pnpm build
```

### Build Errors

Ensure all dependencies are installed and types are correct:
```bash
pnpm install
pnpm typecheck
pnpm build
```

### Demo Server Not Starting

Check that the arena-2d library is built:
```bash
pnpm build --filter=@arena-2d/arena-2d
pnpm dev --filter=@arena-2d/demo
```

## Performance Tips

- **First build is slow** — Turborepo caches results; subsequent builds are faster
- **Use `--filter`** — Only build/test what you're working on
- **Watch mode** — Use `bun test --watch` in a package for iterative development
- **Parallel tasks** — Turborepo runs independent tasks in parallel automatically

## Contributing

1. Create a new branch for your feature
2. Make changes in the relevant package(s)
3. Run quality checks: `pnpm build && pnpm test && pnpm typecheck && pnpm lint`
4. Commit your changes (user will handle git workflow)

## Resources

- [pnpm Documentation](https://pnpm.io)
- [Turborepo Documentation](https://turbo.build)
- [Biome Linter](https://biomejs.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Bun](https://bun.sh)
