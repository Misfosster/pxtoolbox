import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  // When deploying to GitHub Pages on a project site, assets are served from /<repo>/
  // Allow overriding via REPO_NAME env or default to root for local/dev
  const repoName = process.env.REPO_NAME
  const isCI = !!process.env.GITHUB_ACTIONS
  const base = isCI && repoName ? `/${repoName}/` : '/'

  return {
    plugins: [react()],
    base,
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  }
})
