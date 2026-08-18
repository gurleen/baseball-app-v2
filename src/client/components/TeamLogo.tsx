export function teamLogoUrl(teamId: number): string {
  return `https://www.mlbstatic.com/team-logos/team-cap-on-dark/${teamId}.svg`
}

export function TeamLogo({ teamId, width = 30 }: { teamId: number; width?: number }) {
  return <img src={teamLogoUrl(teamId)} alt="" width={width} height={width} />
}
