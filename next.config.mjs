import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

/** Short commit SHA: from git when the build runs in a checkout, else from Coolify's SOURCE_COMMIT. */
function buildCommit() {
  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    if (sha) return sha
  } catch {
    /* no .git in the build context */
  }
  return (process.env.SOURCE_COMMIT ?? '').slice(0, 7)
}

const builtAt = new Date()

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_BUILD_MONTH: builtAt.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
    NEXT_PUBLIC_BUILD_COMMIT: buildCommit(),
    NEXT_PUBLIC_BUILD_TIME: `${builtAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
  },
};

export default nextConfig;
