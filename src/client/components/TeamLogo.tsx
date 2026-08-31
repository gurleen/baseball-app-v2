import { useTheme } from "@hydra-tv/ui"

export function teamLogoUrl(teamId: number, theme: "dark" | "light" = "dark"): string {
  return `https://www.mlbstatic.com/team-logos/team-cap-on-${theme}/${teamId}.svg`
}

export function TeamLogo({ teamId, width = 30 }: { teamId: number; width?: number }) {
  const { theme } = useTheme()
  return <img src={teamLogoUrl(teamId, theme)} alt="" width={width} height={width} />
}
