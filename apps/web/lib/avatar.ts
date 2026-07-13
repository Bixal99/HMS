/** Blue-family avatar tint variants derived from a name hash (theme tokens only). */
const AVATAR_TONES = [
  "bg-primary/15 text-primary",
  "bg-primary/25 text-primary",
  "bg-accent/15 text-accent-foreground",
  "bg-accent/25 text-primary",
] as const;

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function avatarToneClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % 997;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length]!;
}
