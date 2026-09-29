export function formatCompetencyLevel(level: string): string {
  return level.charAt(0) + level.slice(1).toLowerCase();
}