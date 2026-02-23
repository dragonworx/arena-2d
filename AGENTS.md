# AGENTS.md - Arena-2D Developer Guide

Guide for AI agents (and human developers) working on the Arena-2D codebase.

---

## 🎯 Project Overview

**Arena-2D** is a high-performance TypeScript rendering engine for rich 2D applications. It provides a retained-mode VDOM abstraction over Canvas, supporting:
- Scene graphs and nested elements
- Flexbox + anchor positioning (hybrid layout)
- Unified interaction model (pointer, keyboard, focus)
- Affine transformations (position, rotation, scale, skew, pivot)
- Rich text with character-level metrics
- Multi-view rendering
- Layer composition
- Animation timelines (Ticker system)
- Spatial hashing for performance

**Repository:** https://github.com/dragonworx/arena-2d

---

## 📁 Project Structure

```
src/
├── Arena2D.ts              # Main exports
├── index.ts                # Public API
├── animation/              # Tween system, Ticker
├── core/                   # Scene, View, Element, Container, Layer
├── elements/               # UI elements (Rect, Circle, Text, Image, etc.)
├── events/                 # Event system (pointers, keyboard)
├── geometry/               # Shapes (Rectangle, Ellipse, Polygon, etc.)
├── interaction/            # Hit testing, spatial hashing
├── layout/                 # Flexbox + anchor positioning
├── math/                   # Matrix, Vector, Point utilities
├── rendering/              # Canvas2D wrapper (Arena2DContext)
├── text/                   # Text layout and IME bridge
└── internal/               # Internal utilities

demo/                       # Live interactive demo site
tests/                      # Unit tests (Bun test)
docs/                       # Generated TypeDoc documentation
dist/                       # Built artifacts
```

---

## 🚀 Setup & Commands

### Prerequisites
- **Bun** 1.0+ (or Node.js 18+ with npm/yarn, but Bun is required for local development)
- TypeScript 5.9+

### Essential Commands

```bash
# Start live-reloading dev server (http://localhost:3000)
bun run dev

# Run unit tests (Bun test runner)
bun test

# Build production bundle
bun run build

# Type-check without emitting
bun run typecheck

# Lint with Biome
bun run lint
bun run lint:fix

# Generate TypeDoc HTML documentation
bun run docs

# Full quality check (typecheck + lint + tests)
bun run quality
```

---

## 🏗️ Architecture

### Core Concepts

#### 1. **Element Hierarchy** (src/core/Element.ts)
- Base class for all scene graph nodes
- Properties: position, rotation, scale, skew, alpha, visibility, etc.
- Dirty flag system for efficient redraws
- Event handling (pointer, keyboard)

#### 2. **Scene & Views** (src/core/Scene.ts, View.ts)
- **Scene**: Manages one or more Views rendering to the same canvas
- **View**: Independent viewport into the scene with pan/zoom
- Multiple views can share the same scene graph with different transforms

#### 3. **Container** (src/core/Container.ts)
- Group element for hierarchical scene graphs
- Supports Flexbox and anchor positioning
- `children` array for nested elements

#### 4. **Layer System** (src/core/Layer.ts)
- Split rendering across multiple canvas layers
- Static layers (background, decorative) don't redraw every frame
- Dynamic layers update as needed—huge performance win

#### 5. **Ticker** (src/core/Ticker.ts)
- Nested animation timeline system
- Independent frame rates per ticker
- Automatic frame loop management

#### 6. **Geometry & Shapes** (src/geometry/)
- Base **Geometry** class with shared methods (intersection, containment)
- Implementations: Rectangle, Circle, Ellipse, Arc, Line, Polygon, BezierCurve, etc.
- CompositeGeometry for complex shapes
- Used for hit testing and visualization

#### 7. **Elements Library** (src/elements/)
- **ShapeElement**: Base for filled/stroked shapes (Rect, Circle)
- **GeometryElement**: General-purpose shape renderer
- **Text / TextInput**: Rich text rendering with IME support
- **Image / NineSlice**: Image rendering with optional 9-slice scaling
- **ScrollContainer**: Virtualized scrolling with momentum

---

## 📋 Key Patterns & Conventions

### Naming Conventions
- **Classes:** PascalCase (`Element`, `Container`, `TextInput`)
- **Methods:** camelCase (`addChild()`, `intersectsShape()`)
- **Properties:** camelCase (`x`, `width`, `rotation`)
- **Private methods:** `_camelCase()` (e.g., `_applyWorldTransform()`)
- **Protected methods:** `_camelCase()` (same as private for now)
- **Constants:** UPPER_SNAKE_CASE (`MAX_ITERATIONS`, `DEFAULT_WIDTH`)

### Element Property Setters
- All numeric setters use `_safeFinite()` to validate values
- Invalid values (NaN, Infinity) are corrected to safe defaults
- See Element.ts:20-25 for the pattern

### Geometry Base Class Methods
Three shared methods defined in base **Geometry** class (src/geometry/Geometry.ts):
- `intersectsShape(other)` - 32-point sampling default, overridable
- `containsPoint(x, y)` - uses closest-point distance check
- `lineSegmentIntersection()` - static helper for line math
- `uniformScale` getter - replaces `Math.sqrt(Math.abs(this.scaleX * this.scaleY))`

Subclasses can override these for optimized implementations.

### Dirty Flags
- Located in src/core/DirtyFlags.ts
- Each element tracks which properties changed
- View._collectDirty() gathers all dirty elements
- Only dirty elements redrawn → performance

### Transform Stack
- View maintains transform matrix stack during render
- `Element._applyWorldTransform()` applies rotation, scale, skew, pivot
- Automatic clipping for elements with overflow hidden

---

## 🛠️ Development Guidelines

### Code Quality
- **Linting:** Must pass Biome checks (`bun run lint`)
- **Type Safety:** No `any` types without `// @ts-ignore` comments
- **Testing:** Unit tests for public APIs
- **Performance:** Consider bundle size (see bundle optimization below)

### When Writing Code
1. **Check existing patterns first** - Look for similar functionality
2. **Use private/protected methods for helpers** - `_methodName()` for internals
3. **Validate at boundaries** - Input validation, but trust internal APIs
4. **Avoid premature abstraction** - 3 similar lines is better than a helper
5. **Keep it simple** - Only add complexity when actually needed

### Comments
- Only add comments where logic isn't self-evident
- Prefer clear variable/function names over comments
- Document public API with JSDoc for generated docs

### Error Handling
- Invalid numeric values corrected via `_safeFinite()`
- Enable debug mode to surface warnings: `enableDebugMode(true)`
- No try-catch unless dealing with external APIs

---

## 📦 Bundle Size & Optimization

### Recent Optimization (Feb 2026)
Successfully implemented 15 optimization items reducing bundle size by ~398 lines:

**1. Geometry Base Class Enhancements**
- Added 3 concrete methods to base Geometry class:
  - `intersectsShape()` - default 32-point sampling
  - `containsPoint()` - default closest-point check
  - `lineSegmentIntersection()` - static helper
- Added `uniformScale` getter to replace repeated scale calculations

**2. Geometry Subclass Refactoring**
- Removed duplicate implementations from 8 geometry classes
- Now delegate to base implementations where appropriate

**3. ShapeElement Base Class**
- Created new `ShapeElement` extending `Element`
- Moved shared fill/stroke/lineWidth properties
- Used by Rect and Circle

**4. View.ts Helpers**
- `_shouldCull()` - consolidated frustum culling logic
- `_sortedChildren()` - extracted child sorting
- `_applyWorldTransform()` - extracted matrix transform

**5. Element._safeFinite**
- Private method for numeric validation
- Applied to 10 numeric property setters

**6. InteractionManager._isDescendantOf**
- Extracted ancestor checking logic
- Applied to 3 exclusion check locations

**7. Text Helpers**
- TextInput._getCat() - character categorization
- Text._alignOffsetX() - alignment offset calculation

**8. Arena2DContext._applyFillStroke**
- Private method for fill/stroke application
- Applied to 4 shape drawing methods

**9. SpatialHashGrid._getCellBounds**
- Private method for cell coordinate calculation

**10. Index.ts Export Consolidation**
- Replaced 29 individual geometry exports with `export * from "./geometry"`

### Build Output
```bash
# JavaScript production build
bun run build

# Type declaration bundling
bunx dts-bundle-generator -o dist/arena-2d.d.ts src/index.ts

# TypeScript compilation check
bun run typecheck
```

---

## 📚 Important Files Reference

### Core Files to Understand First
- **src/index.ts** - Public API exports (start here)
- **src/core/Element.ts** - Base class for all scene nodes
- **src/core/Scene.ts** - Scene setup and management
- **src/core/Container.ts** - Grouping and layout
- **src/geometry/Geometry.ts** - Base class for shapes

### Element Implementations
- **src/elements/ShapeElement.ts** - Base for filled/stroked shapes
- **src/elements/Rect.ts** - Rectangle element
- **src/elements/Circle.ts** - Circle element
- **src/elements/Text.ts** - Rich text rendering
- **src/elements/TextInput.ts** - Editable text with IME

### Rendering & Interaction
- **src/rendering/Arena2DContext.ts** - Canvas2D wrapper
- **src/interaction/InteractionManager.ts** - Hit testing & events
- **src/interaction/SpatialHashGrid.ts** - Spatial indexing for hit tests

### Layout & Animation
- **src/layout/** - Flexbox implementation
- **src/animation/TweenManager.ts** - Tween system
- **src/core/Ticker.ts** - Animation frame loop

---

## 🔧 Common Tasks

### Adding a New Element Type
1. Extend `Element` or appropriate base (`ShapeElement` for shapes)
2. Implement `paint(view: View)` method
3. Add to src/index.ts exports
4. Create demo in demo/panels/

### Adding a Geometry Shape
1. Extend `Geometry` base class
2. Implement required abstract methods
3. Can override `intersectsShape()`, `containsPoint()` for optimization
4. Add to geometry/index.ts
5. Create GeometryElement wrapper in elements/

### Optimizing Performance
1. Use Layer system for static content
2. Consider SpatialHashGrid for many interactive elements
3. Profile with DevTools before optimizing
4. Check bundle size: `bun run build`
5. Review DirtyFlags usage for unnecessary redraws

### Writing Tests
- Test files: `tests/**/*.test.ts`
- Run with: `bun test`
- Use happy-dom for DOM simulation
- Test both API and rendering output

---

## 🐛 Debugging Tips

### Enable Debug Mode
```typescript
import { enableDebugMode } from 'arena-2d';
enableDebugMode(true);
```

### Common Issues
1. **NaN/Infinity values** - Check setters, they auto-correct
2. **Elements not rendering** - Check alpha, visibility, z-order (parent order)
3. **Touch/pointer not working** - Check `interactive = true` and hit test bounds
4. **Performance issues** - Profile in DevTools, check DirtyFlags, use Layers
5. **Text not visible** - Check font, fill color, text metrics

### DevTools Tips
- Use Canvas Inspector for rendering debug
- Profile with Performance tab
- Check memory growth during animations
- Monitor dirty flag patterns in View

---

## 📖 Documentation

- **TypeScript Docs:** Run `bun run docs` → opens in `docs/` folder
- **Product Requirements:** See spec files in `specs/`
- **Code Examples:** Check `demo/` folder for interactive examples

---

## 🔗 Key Dependencies

- **TypeScript 5.9+** - Language and type system
- **Bun 1.0+** - Build tool, test runner, dev server
- **Biome** - Linting and formatting
- **happy-dom** - DOM simulation for testing
- **dts-bundle-generator** - TypeScript declaration bundling
- **TypeDoc** - API documentation generation

---

## 🎨 Development Workflow

1. **Plan** - Understand the task, check related code
2. **Explore** - Read relevant source files
3. **Implement** - Make changes, keep bundle size in mind
4. **Test** - Run `bun test` and manual testing in demo
5. **Quality Check** - Run `bun run quality` (typecheck + lint + tests)
6. **Optimize** - Review bundle size, consider refactoring
7. **Document** - Update comments and type annotations as needed

---

## 📝 Git Workflow

- **Main branch:** Primary development branch
- **Commit messages:** Clear, semantic (feat:, fix:, refactor:, docs:, etc.)
- **Bundle size:** Include optimization notes in commit messages
- **Testing:** Ensure all tests pass before committing

---

## 🤖 For AI Agents

### What to Do
✅ Read existing code before making changes
✅ Follow established patterns and conventions
✅ Keep bundle size in mind (use shared base classes)
✅ Run full quality checks before completion
✅ Update auto-memory with architectural patterns
✅ Consider performance implications of changes

### What NOT to Do
❌ Create new files unless absolutely necessary
❌ Break existing APIs without discussion
❌ Add complexity beyond requirements
❌ Ignore type errors or use `any` types
❌ Refactor unrelated code
❌ Add features not requested

### Useful Commands for Agents
```bash
# Quick validation
bun run typecheck && bun run lint

# Full test suite
bun test

# Check build size
bun run build

# Watch mode for development
bun run dev
```

---

## 📞 Support & Resources

For questions about:
- **Claude Code features:** Use `/help` command
- **Project issues:** Check GitHub repo issues
- **Feedback:** Report at https://github.com/anthropics/claude-code/issues

---

**Last Updated:** February 2026
**Maintainer:** dragonworx
