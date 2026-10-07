import pkg from '@/package.json'

export interface BuildInfo {
  version: string
  /** Three-letter month the build was made, e.g. "Oct". */
  month: string
  commit: string
  time: string
}

export function buildInfo(): BuildInfo {
  return {
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? pkg.version,
    month: process.env.NEXT_PUBLIC_BUILD_MONTH ?? '',
    commit: process.env.NEXT_PUBLIC_BUILD_COMMIT ?? '',
    time: process.env.NEXT_PUBLIC_BUILD_TIME ?? '',
  }
}
