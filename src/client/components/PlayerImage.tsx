export function playerPhotoUrl(playerId: number): string {
  return `https://midfield.mlbstatic.com/v1/people/${playerId}/silo/120`
}

export function PlayerImage({ playerId, size = 64 }: { playerId: number; size?: number }) {
  return <img src={playerPhotoUrl(playerId)} alt="" width={size} height={size} />
}
