// Shared TypeScript types for cards, game state, and zone names.
export type Zone = 'library' | 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'command'
export type GameMode = 'normal' | 'commander'

export interface Card {
  id: string
  name: string
  image_uri: string
  zone: Zone
  tapped: boolean
  counters: Record<string, number>
  x: number
  y: number
  is_commander: boolean
  is_token: boolean
  // Optional — absent in cached/legacy state; treated as false/'' when missing
  face_down?: boolean
  back_image_uri?: string
  transformed?: boolean
}

export interface GameState {
  cards: Record<string, Card>
  library_order: string[]
  graveyard_order: string[]
  life: number
  game_mode: GameMode
  commander_damage: Record<string, number>
  turn: number
  opponent_count: number
  opponent_names: string[]
  poison_counters: number
  commander_returns: number
  active_viewer: 'graveyard' | 'exile' | null
  spectator_zone_viewing: boolean
  arena_width: number
  arena_height: number
  card_scale: number
  card_z_order: string[]
}
