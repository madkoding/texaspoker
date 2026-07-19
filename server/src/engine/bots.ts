const BOT_NAMES = [
  "Maverick", "Doc", "Rooster", "Iceman", "Goose",
  "Viper", "Jester", "Hollywood", "Wolfman", "Slider",
  "Cougar", "Falco", "Phoenix", "Midas", "Bandit",
  "Sultan", "Bluff", "Chip", "Lucky", "Skyler",
];

const usedNames = new Set<string>();

export function takeBotName(): string {
  const available = BOT_NAMES.filter((n) => !usedNames.has(n));
  const pick = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : `Bot-${Math.random().toString(36).slice(2, 6)}`;
  usedNames.add(pick);
  return pick;
}

export function releaseBotName(name: string) {
  usedNames.delete(name);
}
