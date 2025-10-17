# PX Toolbox

A developer utilities platform built for incremental development during William's internship. This is the base project ready for adding tools one by one.

## Current Status

**Production-ready developer toolkit.** All core tools implemented with advanced features and comprehensive testing.

### Implemented Tools

#### **🔧 Base64 Encoder/Decoder** (`/#/tools/base64`)
- **Dual-pane interface**: Text ↔ Base64 with live conversion
- **Base64URL support**: Handles URL-safe Base64 encoding
- **Smart padding**: Auto-adds missing padding characters
- **Whitespace tolerance**: Ignores whitespace in input
- **File operations**: Encode/decode files with drag & drop support
- **Copy buttons**: Individual copy actions for each pane
- **Format detection**: Auto-detects common file types (PNG, JPEG, PDF, text)

#### **🔐 JWT Decoder** (`/#/tools/jwt`)
- **Token parsing**: Decodes header and payload with signature display
- **Time helpers**: Shows `nbf`, `iat`, `exp` with UTC and relative times
- **Toggleable hints**: Show/hide helper information
- **Copy functionality**: Copy header, payload, or full token
- **Validation**: Visual feedback for malformed tokens
- **Responsive layout**: Works on all screen sizes

#### **🌐 URL Encoder/Decoder** (`/#/tools/url`)
- **Bidirectional conversion**: Text ↔ URL encoding
- **Standards compliant**: Uses `encodeURIComponent`/`decodeURIComponent`
- **Space handling**: Properly handles `+` as space in decoding
- **Copy buttons**: Quick copy actions for both directions
- **Clear interface**: Simple, focused tool design

#### **📋 JSON Formatter** (`/#/tools/json`)
- **Real-time validation**: Validates as you type with error indicators
- **Dual-pane editing**: Formatted text (left) ↔ foldable tree (right)
- **Inline editing**: Click any value in tree to edit directly
- **Smart formatting**: Auto-formats on valid paste/type
- **Copy options**: Copy formatted, minified, or tree data
- **Collapsible tree**: Fold/unfold nested objects and arrays
- **Responsive design**: Adapts to different screen sizes

#### **⚖️ Diff Viewer** (`/#/tools/diff`)
- **Side-by-side comparison**: Two text inputs with synchronized scrolling
- **Unified preview**: Clean diff view with additions (green), deletions (red), modifications (blue)
- **Advanced navigation**: Arrow keys navigate between modifications only
- **Smart positioning**: Focused modifications center in viewport for optimal visibility
- **Container awareness**: Works correctly in multiple-pane layouts
- **Whitespace handling**: Toggle to ignore whitespace differences
- **Persisted-only mode**: Show only resolved changes and persistent content
- **Responsive gutters**: Line numbers and markers align properly

### Future Enhancements
- **Hash Generators**: MD5, SHA1, SHA256, SHA3
- **Case Converters**: camelCase, snake_case, kebab-case, PascalCase
- **API Testing Tools**: HTTP client with request builder and response formatting
- **Regex Tester**: Interactive regular expression testing and validation
- **Color Tools**: Color picker, converter (HEX, RGB, HSL), and palette generator

### Project Features
- **Dark Theme**: Professional, modern interface
- **No Backend Required**: All processing happens locally in your browser
- **Responsive Design**: Works on desktop and mobile
- **Incremental Development**: Add tools one at a time

## Architecture

- **Component-based design**: Each tool is a self-contained React component
- **Shared UI primitives**: Common components in `src/components/ui/` for consistency
- **Utility-first logic**: Business logic separated into `src/utils/` modules
- **TypeScript throughout**: Full type safety from components to utilities
- **Test-driven development**: Comprehensive E2E tests for all user interactions

## Tech Stack

- **React 18** with TypeScript for type-safe component development
- **Blueprint.js** for consistent, accessible UI components
- **Vite** for fast development server and optimized production builds
- **React Router** with smart routing (BrowserRouter for production/GitHub Pages, HashRouter only for test environment)
- **Playwright** for comprehensive end-to-end testing
- **ESLint + Prettier** for code quality and formatting
- **GitHub Actions** for automated CI/CD with testing and deployment

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
- If tests fail to find routes, ensure tests use hash routing (`/#/tools/...`) while production uses clean URLs (`/tools/...`).

## Deployment

### GitHub Pages (Project Site)
This repo is configured to deploy to GitHub Pages using GitHub Actions. It supports both user/org and project sites.

- Router uses `BrowserRouter` for clean URLs on GitHub Pages (test environment uses `HashRouter`)
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

## Tool Features

### **🔧 Base64 Encoder/Decoder**
- **Live conversion**: Text ↔ Base64 with real-time updates
- **File support**: Drag & drop files for encoding/decoding
- **Smart detection**: Auto-detects file types and formats
- **Error handling**: Graceful handling of malformed input

### **🔐 JWT Decoder**
- **Complete token analysis**: Header, payload, and signature sections
- **Time visualization**: UTC and relative time displays for timestamps
- **Interactive hints**: Toggleable helper information
- **Copy options**: Individual copy buttons for each section

### **🌐 URL Encoder/Decoder**
- **Standards compliant**: Proper URL encoding/decoding
- **Space handling**: Correctly handles `+` as space in decoding
- **Quick actions**: Copy buttons for both input and output

### **📋 JSON Formatter**
- **Dual editing modes**: Text editor and visual tree editor
- **Inline editing**: Click any tree value to edit directly
- **Validation**: Real-time error detection and feedback
- **Multiple formats**: Pretty-print, minify, and tree view options

### **⚖️ Diff Viewer**
- **Visual diff display**: Color-coded additions (green), deletions (red), modifications (blue)
- **Keyboard navigation**: Arrow keys navigate between modifications
- **Smart scrolling**: Focused modifications center in viewport
- **Multiple modes**: Toggle whitespace ignore and persisted-only view
- **Responsive design**: Works on all screen sizes

## License

MIT License - See LICENSE file for details.

## Contributing

This project was developed during William's internship. It serves as both a useful tool suite and a portfolio piece demonstrating modern React/TypeScript development practices.