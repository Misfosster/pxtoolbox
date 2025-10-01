import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

// https://vite.dev/config/
export default defineConfig(() => {
  // When deploying to GitHub Pages on a project site, assets are served from /<repo>/
  // Allow overriding via REPO_NAME env or default to root for local/dev
  const repoName = process.env.REPO_NAME
  const isCI = !!process.env.GITHUB_ACTIONS
  const base = isCI && repoName ? `/${repoName}/` : '/'

  // Read version from package.json
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'))
  const packageVersion = packageJson.version

  // Extract version from release branch or use package.json version
  let appVersion = packageVersion
  let releaseDate = new Date().toISOString().split('T')[0]

  // Try to extract version from branch name (works in both CI and local dev)
  let branchName = process.env.GITHUB_REF_NAME || process.env.GITHUB_HEAD_REF || process.env.GIT_BRANCH
  
  // In development, try to get branch name from git
  if (!branchName && !isCI) {
    try {
      branchName = execSync('git branch --show-current', { encoding: 'utf8' }).trim()
    } catch (error) {
      console.warn('Could not get git branch name:', error instanceof Error ? error.message : String(error))
    }
  }
  
  if (branchName) {
    if (branchName.startsWith('release-')) {
      appVersion = branchName.replace('release-', '')
    } else {
      // For non-release branches, show the branch name as the version
      appVersion = branchName
    }
  }

  // For release branches, try to get the actual release date from git
  if (branchName && branchName.startsWith('release-')) {
    try {
      // Try to get the date when this release branch was created
      // Get the date of the first commit on this release branch
      const gitDate = execSync(`git log --format="%ci" --reverse -n 1`, { encoding: 'utf8' }).trim()
      if (gitDate) {
        releaseDate = gitDate.split(' ')[0] // Extract just the date part
      }
    } catch (error) {
      // Fallback to current date if git command fails
      console.warn('Could not get git release date, using current date:', error instanceof Error ? error.message : String(error))
    }
  }

  return {
    plugins: [react()],
    base,
    server: {
      port: 5174,
    },
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
      'import.meta.env.VITE_APP_RELEASE_DATE': JSON.stringify(releaseDate),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  }
})
