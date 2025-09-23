# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Automated release workflow with GitHub Actions
- Comprehensive security updates (Vite 7.1.7, Vitest 3.2.4)
- Zero vulnerabilities (all security issues resolved)

## [0.1.0] - 2025-09-23

### Added
- **Diff Viewer**: Inline highlights with Beyond Compare-style interface
  - Side-by-side tinting and unified preview
  - Unicode-safe tokenization and grapheme handling
  - Complete empty field logic for all scenarios
  - Smart inline mode with character-level toggle
  - Whitespace ignore toggle (line + inline)
  - Wrap-aware numbering and gutter alignment
  - Custom in-textbox vertical resizer
- **JSON Formatter**: Validation and foldable tree view
  - Auto-format on paste/type
  - Minify/pretty toggle
  - Error handling for invalid JSON
  - SVG connectors in tree view
- **JWT Decoder**: Token decoding with payload hints
  - UTC and relative time formatting
  - Eye toggle for hints visibility
  - Copy respects toggle state
- **Base64 Encoder/Decoder**: Bidirectional conversion
  - URL-safe encoding support
  - Whitespace and padding handling
- **URL Encoder/Decoder**: Web-safe encoding
  - Plus sign handling for spaces
  - Error handling for invalid input
- **Tools Hub**: Registry-driven navigation
  - Sidebar with tool icons and labels
  - Responsive design for mobile
  - Auto-expand on tool routes

### Technical
- **Testing**: 98 unit tests (Vitest) + 53 E2E tests (Playwright)
- **Security**: Zero vulnerabilities, all dependencies updated
- **Build**: Vite 7.1.7 with optimized production builds
- **UI**: Blueprint JS components with consistent design
- **Performance**: Optimized bundle size (~465KB gzipped)

### Infrastructure
- **CI/CD**: GitHub Actions for automated testing and deployment
- **Deployment**: GitHub Pages with automated releases
- **Versioning**: Semantic versioning with automated changelog generation
- **Security**: Regular dependency updates and vulnerability scanning

---

**Legend:**
- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` for vulnerability fixes
