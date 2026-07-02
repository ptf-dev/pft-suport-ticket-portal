const GITHUB_API = 'https://api.github.com'

interface GitHubCommitResult {
  sha: string
  message: string
  author: string
  date: string
  repo: string
  url: string
}

export async function searchCommitsByKey(
  key: string,
): Promise<{ commits: GitHubCommitResult[]; error?: string }> {
  const token = process.env.GITHUB_TOKEN?.trim()
  const org = process.env.GITHUB_ORG?.trim()

  if (!token) return { commits: [], error: 'GITHUB_TOKEN not configured' }
  if (!org) return { commits: [], error: 'GITHUB_ORG not configured' }

  const query = `org:${org} ${key}`
  const res = await fetch(
    `${GITHUB_API}/search/commits?q=${encodeURIComponent(query)}&sort=committer-date&order=desc&per_page=30`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    },
  )

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 401) return { commits: [], error: 'GitHub token invalid or expired' }
    if (res.status === 403) return { commits: [], error: 'GitHub API rate limit exceeded' }
    return { commits: [], error: `GitHub API error ${res.status}: ${body.slice(0, 200)}` }
  }

  const data = await res.json()
  console.log(`[github] search query="${query}" total_count=${data.total_count} incomplete_results=${data.incomplete_results} items=${(data.items ?? []).length}`)

  const commits: GitHubCommitResult[] = (data.items ?? []).map((item: any) => ({
    sha: item.sha,
    message: item.commit?.message?.split('\n')[0] ?? '',
    author: item.commit?.author?.name ?? item.author?.login ?? 'unknown',
    date: item.commit?.committer?.date ?? item.commit?.author?.date ?? '',
    repo: item.repository?.full_name ?? '',
    url: item.html_url ?? '',
  }))

  return { commits }
}

export async function listOrgRepos(): Promise<string[]> {
  const token = process.env.GITHUB_TOKEN?.trim()
  const org = process.env.GITHUB_ORG?.trim()
  if (!token || !org) return []

  const res = await fetch(
    `${GITHUB_API}/orgs/${encodeURIComponent(org)}/repos?per_page=100&sort=pushed&direction=desc`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      next: { revalidate: 300 },
    },
  )

  if (!res.ok) return []
  const data = await res.json()
  return (data ?? []).map((r: any) => r.full_name as string)
}
