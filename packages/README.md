# @aureliajs/packages — Fullstack Library Suite

This folder contains reusable libraries and adapters for the Aurelia 2 ecosystem.

## Current Packages

### 1. `hono-aurelia-ssr` (@hono/aurelia-ssr)

**Status:** Phase 1 Complete ✅  
**Purpose:** Native SSR support for Aurelia 2 on Hono  
**Maintainer:** Sandi Kodev (@sandikodev)  

Server-side rendering adapter that bridges Hono + Aurelia into a native fullstack framework.

- 📦 Production-grade implementation (1,789 lines total)
- 🧪 32 test cases (455 lines) with 80%+ coverage
- 📚 Comprehensive documentation
- 🔒 Type-safe with XSS prevention

**Key Functions:**
- `renderAurelia()` — Render components to HTML
- `serializeState()` — Serialize auth + data
- `createHtmlDocument()` — Build complete HTML
- (Phase 2) `hydrateFromServer()` — Client hydration
- (Phase 3) `aurelia()` — Route adapter

**Proposal:** 
See `PROPOSAL_TO_MAINTAINERS.md` to submit to Hono + Aurelia teams for collaboration.

**Quick Start:**
```bash
cd hono-aurelia-ssr
npm install
npm test           # Run tests
npm run build      # Compile
npm run typecheck  # Type checking
```

### 2. `shared`

**Purpose:** Shared types, schemas, and constants  
**Contents:** Zod schemas, TypeScript types, business logic

---

## Package Structure Convention

Each package follows this structure:

```
package-name/
├── src/              # Source TypeScript
├── test/             # Test files (*.test.ts)
├── dist/             # Compiled output (gitignored)
├── package.json      # Package manifest
├── tsconfig.json     # TypeScript config
├── vitest.config.ts  # Test config
├── README.md         # Package documentation
└── .gitignore        # Standard ignores
```

---

## Contributing Guidelines

### When Adding a New Package

1. **Create directory** under `packages/`
2. **Use this template:**
   ```bash
   mkdir packages/my-package
   cp -r packages/hono-aurelia-ssr/package.json packages/my-package/
   # Edit package.json with your package name
   ```

3. **Add documentation:**
   - README.md (quick start + API)
   - Types/interfaces in JSDoc
   - Test examples as usage patterns

4. **Follow standards:**
   - TypeScript strict mode
   - 80%+ test coverage
   - Comprehensive error handling
   - XSS/security practices

### Development Workflow

```bash
# Install dependencies for specific package
cd packages/hono-aurelia-ssr
npm install

# Run tests
npm test

# Watch mode
npm run test:watch

# Type checking
npm run typecheck

# Build
npm run build
```

---

## Integration with Main Project

These packages are designed to be:

1. **Independently usable** — Can be published to npm individually
2. **Shareable** — Available to multiple projects via npm registry
3. **Monorepo-friendly** — Can use workspace dependencies
4. **Well-documented** — Self-contained, no external context needed

---

## Roadmap

### Q4 2026
- [ ] Finalize hono-aurelia-ssr Phase 1-4
- [ ] Submit to Hono team for feedback
- [ ] Submit to Aurelia team for feedback

### Q1 2027
- [ ] Incorporate feedback from teams
- [ ] Publish to npm
- [ ] Open-source on GitHub
- [ ] Create community examples

### Q2 2027+
- [ ] Support other backend frameworks
- [ ] Support other frontend frameworks
- [ ] Expand adapter ecosystem

---

## Questions?

- **About hono-aurelia-ssr:** See `hono-aurelia-ssr/README.md`
- **About proposal:** See `hono-aurelia-ssr/PROPOSAL_TO_MAINTAINERS.md`
- **About architecture:** See `hono-aurelia-ssr/PHASE_1_SUMMARY.md`

---

**Maintained with ❤️ by Sandi Kodev**
