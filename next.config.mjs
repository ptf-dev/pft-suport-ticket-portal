import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

/**
 * Version string baked at build time so the portal footer always reflects the
 * deployed build instead of being stuck at package.json's semver.
 *   - prefer the short git SHA (e.g. "0.1.0+2f6de31")
 *   - fall back to a build timestamp when git isn't available in the build env
 */
function buildVersion() {
  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
    if (sha) return `${pkg.version}+${sha}`
  } catch {
    /* no git in build context — fall through */
  }
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  return `${pkg.version}+build.${stamp}`
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: buildVersion(),
  },
};

export default nextConfig;
