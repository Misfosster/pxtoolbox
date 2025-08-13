# PX Toolbox

A developer utilities platform built for incremental development during William's internship. This is the base project ready for adding tools one by one.

## Current Status

**Base project ready** and first tool implemented.

### Implemented
- **Base64 Encoder/Decoder**: Encode/decode with Base64URL support, auto-padding, whitespace tolerance, copy buttons, and clear error states. Route: `/#/tools/base64`.

### Planned Features
- **JWT Token Decoder**: Decode and inspect JWT tokens
- **Text Transformation Tools**: Base64, URL encoding/decoding, JSON formatting  
- **Hash Generators**: MD5, SHA1, SHA256
- **Case Converters**: camelCase, snake_case, kebab-case
- **API Testing Tools**: Quick HTTP requests and response formatting

### Project Features
- **Dark Theme**: Professional, modern interface
- **No Backend Required**: All processing happens locally in your browser
- **Responsive Design**: Works on desktop and mobile
- **Incremental Development**: Add tools one at a time

## Tech Stack

- **React 18** with TypeScript
- **Blueprint JS** for UI components
- **Vite** for fast development and building
- **React Router** (HashRouter) for GitHub Pages-friendly routing
- **GitHub Actions** for CI/CD

## Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development

```bash
# Format code
npm run format

# Lint code
npm run lint
```

## Testing

### End-to-End tests (Playwright)

Local run with the same setup CI uses (serves the production build at port 4173):

```bash
# Build once
npm run build

# Run tests (starts preview server automatically on port 4173)
npm run test:e2e
```

Details:
- Preview server command: `npm run preview:ci` (strict port 4173)
- Base URL for tests: `http://localhost:4173` (configured in `playwright.config.ts`)
- Tests are located in `tests/`
- HTML report output: `playwright-report/` (opened manually if needed)

Troubleshooting:
- If the port is in use, stop existing preview servers or change the port in `playwright.config.ts`.
- If tests fail to find routes, ensure the app is using hash routing and navigate via `/#/...` paths in tests.

## Deployment

### GitHub Pages (Project Site)
This repo is configured to deploy to GitHub Pages using GitHub Actions. It supports both user/org and project sites.

- Router uses `HashRouter` so page refreshes work on Pages
- Vite `base` is set dynamically using the repo name in CI

Steps:
1. Push to `main`
2. In GitHub repo: Settings → Pages → Source: GitHub Actions
3. Wait for the workflow to complete
4. Access at: `https://<username>.github.io/<repo>/`

If forking or renaming:
- The workflow passes `REPO_NAME=${{ github.event.repository.name }}` to ensure the correct base path

### Internal Hosting
The `dist/` output can be served by any static file server. No backend required.

## Available Tools

Coming soon as part of incremental development.

## License

MIT License - See LICENSE file for details.

## Contributing

This project was developed during William's internship. It serves as both a useful tool suite and a portfolio piece demonstrating modern React/TypeScript development practices.