export type PortalSearchParams = Record<string, string | string[] | undefined>

export function isReportedByMe(searchParams: PortalSearchParams): boolean {
  return searchParams.reporter === 'me'
}

/** Keeps the current query (view, search, sort) but drops the page, since the result set changes. */
export function reporterHref(pathname: string, searchParams: PortalSearchParams, mine: boolean): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'reporter' || key === 'page') continue
    if (typeof value === 'string' && value) params.set(key, value)
  }
  if (mine) params.set('reporter', 'me')
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
