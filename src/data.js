// Запасні дані: використовуються, якщо API ігор недоступне
export const PALETTES = [
  ['#f59e0b', '#7c2d12'], ['#ef4444', '#450a0a'], ['#fb7185', '#4c0519'], ['#38bdf8', '#082f49'],
  ['#f97316', '#431407'], ['#a855f7', '#2e1065'], ['#a16207', '#27272a'], ['#22c55e', '#052e16'],
]

export const FALLBACK_GAMES = [
  { id: 1, name: 'Counter-Strike 2', genre: 'Шутер', online: 842, description: 'Командний тактичний шутер 5x5.' },
  { id: 2, name: 'Dota 2', genre: 'MOBA', online: 530, description: 'Стратегічні бої на арені 5 на 5.' },
  { id: 3, name: 'Valorant', genre: 'Шутер', online: 410, description: 'Тактичний шутер з унікальними агентами.' },
  { id: 4, name: 'League of Legends', genre: 'MOBA', online: 380, description: 'Командна MOBA з сотнями чемпіонів.' },
  { id: 5, name: 'Apex Legends', genre: 'Battle Royale', online: 295, description: 'Динамічна королівська битва у складі трійок.' },
  { id: 6, name: 'Fortnite', genre: 'Battle Royale', online: 240, description: 'Битва до останнього з будівництвом.' },
  { id: 7, name: 'Rust', genre: 'Виживання', online: 188, description: 'Виживання, крафт і війни кланів.' },
  { id: 8, name: 'Minecraft', genre: 'Виживання', online: 260, description: 'Відкритий світ для будівництва та пригод.' },
].map((g, i) => ({ ...g, c: PALETTES[i % PALETTES.length] }))
