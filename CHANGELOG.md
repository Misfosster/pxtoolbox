# v0.1.1

Bug fixes and minor improvements.

## Changelog

### 🐛 Fixes

- `8c42840` app versioning and release date display
- `803ca21` simplify Deploy workflow to build from source
- `978c7c2` deploy on CI success for release branches
- `85b93f6` repo name for Vite base
- `ce29343` release and deployment workflows

### ✨ Features

- `f19e862` unit tests for version util
- `11f7ef5` implement clean CI → Release → Deploy chain
- `cdf9d81` optimized workflows with branch-based releases + artifact reuse
- `44b0d04` optimized workflows with branch-based releases + artifact reuse
- `06785b2` adds favorite tools functionality
- `4cd4068` home page with tool overviews

### 🔄 Changes

- `- Add REPO_NAME environment variable for Vite base path` 
- `- Eliminate complex artifact chain dependencies` 
- `- Ensure reliable GitHub Pages deployment` 
- `5a89389` Merge branch 'release-v0.1.1'
- `- version is extracted from the branch name for artifact naming` 
- `- deploy workflow is triggered upon successful completion of the release workflow` 
- `- deploy workflow reuses build artifacts from release workflow (no duplicate builds)` 
- `- changelog generation is improved to handle initial releases` 
- `- release artifacts include changelog-based README for better user experience` 
- `- CI workflow is streamlined with better concurrency and artifact retention` 
- `- deploy workflow includes proper permissions and environment configuration` 
- `- version is extracted from the branch name for artifact naming` 
- `- deploy workflow is triggered upon successful completion of the release workflow` 
- `- deploy workflow reuses build artifacts from release workflow (no duplicate builds)` 
- `- changelog generation is improved to handle initial releases` 
- `- release artifacts include changelog-based README for better user experience` 
- `- CI workflow is streamlined with better concurrency and artifact retention` 
- `- deploy workflow includes proper permissions and environment configuration` 
- `version is extracted from the branch name` 
- `deploy workflow is triggered upon successful completion of the release workflow` 
- `changelog generation is improved to handle initial releases` 
- `- Introduces a `useFavorites` hook to manage favorite tool IDs.` 
- `- Updates the Home component to display only favorited tools, offering a cleaner, personalized experience.` 
- `- Adds a toggle favorite button to each tool's shell, allowing users to easily add or remove tools from their favorites.` 
- `- Adjusts Field component to accept ReactNode for labels, allowing custom components to be used within labels.` 
- `includes links to view the source code and release notes (favourite/bookmark feature to be implemented)` 

