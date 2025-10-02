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

  // Extract version from latest git tag or use package.json version
  let appVersion = packageVersion
  let releaseDate = new Date().toISOString().split('T')[0]

  // Try to get the latest git tag (works in both CI and local dev)
  try {
    // Get the latest tag, sorted by version
    const latestTag = execSync('git tag --sort=-version:refname', { encoding: 'utf8' }).trim().split('\n')[0]
    if (latestTag) {
      appVersion = latestTag
      
      // Try to get the date when this tag was created
      try {
        const gitDate = execSync(`git log -1 --format="%ci" ${latestTag}`, { encoding: 'utf8' }).trim()
        if (gitDate) {
          releaseDate = gitDate.split(' ')[0] // Extract just the date part
        }
      } catch (error) {
        console.warn('Could not get git tag date, using current date:', error instanceof Error ? error.message : String(error))
      }
    }
  } catch (error) {
    console.warn('Could not get latest git tag, using package.json version:', error instanceof Error ? error.message : String(error))
  }

  // Get recent releases for homepage display
  let recentReleases: Array<{version: string, date: string, description?: string}> = []
  try {
    const releasesOutput = execSync('git for-each-ref --format="%(refname:short) %(creatordate:short)" refs/tags --sort=-creatordate', { encoding: 'utf8' }).trim()
    if (releasesOutput) {
      const releases = []
      const lines = releasesOutput.split('\n').slice(0, 3) // Get last 3 releases
      
      for (const line of lines) {
        const [version, date] = line.trim().split(' ')
        if (version && date) {
          // Try to get the tag message/description
          let description = ''
          try {
            const tagMessage = execSync(`git tag -l --format="%(contents:subject)" ${version}`, { encoding: 'utf8' }).trim()
            description = tagMessage || ''
          } catch (error) {
            // If we can't get the tag message, that's okay
          }
          
          releases.push({
            version,
            date,
            description: description || undefined
          })
        }
      }
      
      recentReleases = releases
    }
  } catch (error) {
    console.warn('Could not fetch recent releases:', error instanceof Error ? error.message : String(error))
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
      'import.meta.env.VITE_APP_RECENT_RELEASES': JSON.stringify(recentReleases),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  }
})
