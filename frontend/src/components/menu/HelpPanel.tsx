// Help panel — keyboard shortcuts, feature overview, and links to support.
interface HelpPanelProps {
  onClose: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex gap-2 text-xs mb-1">
      <span className="text-gray-200 font-medium w-44 shrink-0">{label}</span>
      <span className="text-gray-400">{desc}</span>
    </div>
  )
}

export function HelpPanel({ onClose }: HelpPanelProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 flex items-stretch justify-end"
      onClick={onClose}
    >
      <div
        className="h-screen w-[520px] bg-mtg-card border-l border-gold/30 p-6 overflow-y-auto flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-gold font-semibold text-lg">Help</h2>
          <button
            aria-label="Close"
            className="text-gray-400 hover:text-gold text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <Section title="Basic controls">
          <Row label="Click a card" desc="Tap or untap it" />
          <Row label="Right-click a card" desc="Open context menu (move to zone, flip face-down, transform, counters, copy)" />
          <Row label="Drag a card" desc="Drop onto the battlefield to place it at that position" />
          <Row label="Hover a card" desc="Show large card preview in the corner" />
          <Row label="Hover battlefield card" desc="Show counter toolbar (+1/+1 quick buttons and full counter menu ⊕)" />
        </Section>

        <Section title="Multi-select">
          <Row label="Shift+click cards" desc="Select multiple cards on the battlefield (gold ring shown)" />
          <Row label="Click & drag empty space" desc="Draw a rubber band rectangle — all cards whose center is inside become selected" />
          <Row label="Shift + rubber band" desc="Add rubber band results to the existing selection" />
          <Row label="Click empty space" desc="Clear the current selection" />
          <Row label="Drag a selected card" desc="All selected cards move together, keeping their relative positions" />
          <Row label="Right-click selection" desc="Context menu shows bulk actions: Tap all, Untap all, Move all, Stack, Attach" />
          <Row label="Stack horizontal ⇔" desc="Stack selected cards — right-clicked card is the anchor (back). Other cards stack in front sorted left-to-right" />
          <Row label="Stack vertical ⇕" desc="Same as horizontal but sorted top-to-bottom" />
          <Row label="Stack gap" desc="Offset between overlapping cards — adjust in Settings (20–60 px)" />
          <Row label="Attach to this card" desc="Right-click the host card — other selected cards move diagonally onto it. Host stays on top (highest z), equipment fans out behind it diagonally" />
        </Section>

        <Section title="Card stacking & z-order">
          <div className="text-xs text-gray-400 leading-relaxed space-y-2">
            <p>
              When cards overlap, the card you <strong className="text-gray-200">dragged most recently</strong> is
              always on top. Drag any card to bring it to the front.
            </p>
            <p>
              <strong className="text-gray-200">Stack</strong> uses the card you
              <strong className="text-gray-200"> right-clicked</strong> as the anchor (back/lowest z).
              Other cards are placed in front of it in spatial order. This works the same whether
              you shift+clicked or used rubber band selection.
            </p>
            <p>
              <strong className="text-gray-200">Attach to this card</strong> right-click the
              host (creature), then choose Attach. Equipment cards move diagonally onto the host
              with a gap offset in both x and y. The host is always on top; equipment fans out
              behind it so each card's corner is visible and clickable.
            </p>
            <p>
              To interact with a card that is partially hidden behind another, click or hover
              the visible sliver — only the topmost card's area captures events, so the sliver
              always reaches the card behind it.
            </p>
          </div>
        </Section>

        <Section title="Zones">
          <Row label="Library" desc="Your draw pile — click Draw, Shuffle, Browse, Scry, or Reveal" />
          <Row label="Hand" desc="Cards in your hand — shown below the arena (not visible in OBS)" />
          <Row label="Battlefield" desc="Free-form drop area — drag cards anywhere" />
          <Row label="Graveyard / Exile" desc="Click the zone label to open a card viewer" />
          <Row label="Command Zone" desc="Commander mode only — drag commander onto battlefield to play it" />
        </Section>

        <Section title="Commander zone">
          <Row label="Tax counter" desc="Shows the current commander tax (+2 per return). Increments automatically each time your commander goes back to the command zone from play" />
          <Row label="× button" desc="Reset the tax counter (e.g. at the start of a new game or if you miscounted)" />
        </Section>

        <Section title="Bottom strip (arena)">
          <Row label="Life counter" desc="Click +/− to adjust life total" />
          <Row label="Poison" desc="Track poison counters (10 = loss)" />
          <Row label="Next Turn" desc="Increments turn, untaps all, draws a card" />
          <Row label="Untap All" desc="Untap everything on the battlefield (with confirmation)" />
          <Row label="+ Token" desc="Search Scryfall for a token or build a custom one" />
        </Section>

        <Section title="Keyboard shortcuts">
          <Row label="D" desc="Draw 1 card" />
          <Row label="N" desc="Next turn" />
          <Row label="T" desc="Tap all selected cards (requires a selection)" />
          <Row label="U" desc="Untap all selected cards (requires a selection)" />
          <p className="text-xs text-gray-600 mt-1">Shortcuts are disabled while typing in any text field.</p>
        </Section>

        <Section title="Game menu">
          <Row label="New Game" desc="Reset the board (confirmation required)" />
          <Row label="Import New Deck" desc="Load a new deck in MTGA format" />
          <Row label="Game Log" desc="Toggle the action log panel below the arena" />
          <Row label="Copy Spectator URL" desc="Copies a clean arena-only URL — use it as an OBS Browser Source or share it directly with another player so they can watch your board live" />
        </Section>

        <Section title="Spectator view">
          <div className="text-xs text-gray-400 leading-relaxed space-y-3">

            <p>
              Game menu → <strong className="text-gray-200">Copy Spectator URL</strong> gives a clean arena-only view — no menu bar, no hand zone, nothing private.
              It connects to your active session and updates live.
            </p>

            <p className="text-gray-300 font-medium">Option 1 — Share your board directly (no OBS needed)</p>
            <p className="text-[11px]">Each player runs their own vPlaymat session. Share your Spectator URL so others can see your board live in their browser.</p>
            <ol className="list-decimal list-inside space-y-1 ml-1 text-[11px]">
              <li>Game menu → <strong className="text-gray-200">Copy Spectator URL</strong></li>
              <li>Send the URL to your opponent (Discord, chat, etc.)</li>
              <li>They open it in a browser tab — your battlefield updates live for them</li>
              <li>Ask them to share their URL back so you can see their board too</li>
            </ol>
            <p className="text-[11px]">No Spelltable account, no OBS, no virtual camera needed.</p>

            <p className="text-[11px]">
              <strong className="text-gray-300">Playing with a full table (2–4 players) —</strong>{' '}
              Each player shares their Spectator URL with everyone else. Open one browser tab per player to watch all boards at once. Each player controls only their own board privately.
            </p>

            <p className="text-gray-300 font-medium pt-1">Option 2 — OBS Browser Source (for streaming)</p>
            <p className="text-[11px]">Use the Spectator URL as an OBS Browser Source to stream your board to Spelltable, Discord, or any platform via a virtual camera.</p>
            <p className="text-[11px] text-gray-300">Setup (one time):</p>
            <ol className="list-decimal list-inside space-y-1 ml-1 text-[11px]">
              <li>Open vPlaymat and import your deck — this is where you play</li>
              <li>Game menu → <strong className="text-gray-200">Copy Spectator URL</strong></li>
              <li>In OBS, click <strong className="text-gray-200">+</strong> in the Sources panel and choose <strong className="text-gray-200">Browser</strong></li>
              <li>Paste the URL and set <strong className="text-gray-200">Width × Height</strong> to match your arena size in Settings (default 1280 × 720)</li>
              <li>Click OK</li>
            </ol>
            <p className="text-amber-400/80 text-[11px]">
              ⚠ Width &amp; Height in OBS must exactly match your arena size — if they differ you will see a cropped view or black bars.
            </p>
            <p className="text-[11px]">
              <strong className="text-gray-300">Black bar below the battlefield?</strong>{' '}
              OBS → Settings → Video → set Base Resolution to <strong className="text-gray-200">1280 × 720</strong>, or right-click the source → <strong className="text-gray-200">Transform → Fit to screen</strong>.
            </p>
            <p className="text-[11px] text-gray-300">Sending to Spelltable / Discord:</p>
            <ol className="list-decimal list-inside space-y-1 ml-1 text-[11px]" start={6}>
              <li>In OBS click <strong className="text-gray-200">Start Virtual Camera</strong></li>
              <li>In Spelltable or Discord, select <strong className="text-gray-200">OBS Virtual Camera</strong> as your camera</li>
            </ol>

            <p className="text-gray-300 font-medium pt-1">Option 3 — OBS Screen capture (alternative)</p>
            <ol className="list-decimal list-inside space-y-1 ml-1 text-[11px]">
              <li>In OBS add a <strong className="text-gray-200">Window Capture</strong> source pointing at this browser window</li>
              <li>Add a <strong className="text-gray-200">Crop/Pad</strong> filter (right-click source → Filters) to crop to just the arena — cut out the menu bar at the top and everything below the arena border</li>
              <li>Enable <strong className="text-gray-200">OBS Virtual Camera</strong> and select it in Spelltable / Discord</li>
            </ol>
            <ul className="list-disc list-inside space-y-0.5 ml-1 text-[11px]">
              <li>If you resize the browser window the crop will be off and needs re-adjusting</li>
              <li>Your browser window must not be hidden behind other windows during play</li>
            </ul>

            <p className="text-gray-300 font-medium pt-1">General tips</p>
            <ul className="list-disc list-inside space-y-0.5 ml-1 text-[11px]">
              <li>The <strong className="text-gray-200">arena size</strong> in Settings (default 1280 × 720) should match your OBS canvas for the cleanest result</li>
              <li>Everything <strong className="text-gray-200">below the arena</strong> (hand, card preview, buttons) is never visible — it stays private</li>
              <li>If you change your arena size in Settings, update the Browser Source dimensions in OBS to match</li>
            </ul>

            <p className="text-gray-300 font-medium pt-1">Zone panel &amp; zone viewer</p>
            <p className="text-[11px] text-gray-400">
              The spectator view shows the left-side zone panel — library count, graveyard, and exile — just like the player sees.
              When you (the player) open the graveyard or exile viewer, the spectator automatically sees the same overlay.
              They can dismiss it locally by clicking outside; only you can actually close it.
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              To let spectators browse those zones independently, enable <strong className="text-gray-200">Allow spectators to open graveyard &amp; exile</strong> in Settings → Spectator.
              When this is on, spectators can open the zone viewer themselves — and your viewer will no longer mirror to them (to avoid two overlapping boxes appearing at once).
            </p>

            <p className="text-gray-300 font-medium pt-1">Card preview in the spectator view</p>
            <p className="text-[11px] text-gray-400">
              Hovering a card shows a large preview in a corner of the screen.
              Click the <strong className="text-gray-200">⚙</strong> icon in the top-right corner to toggle the preview,
              adjust its size, or move it to a different corner. Settings are saved per browser.
            </p>

          </div>
        </Section>

        <Section title="Sessions">
          <Row label="Session lifetime" desc="Your board is saved server-side and persists across tab close and reopen in the same browser. Sessions expire after 1 hour of inactivity — the board is cleared automatically when you return after a long break." />
          <Row label="Incognito / private window" desc="Opens a fresh session with no board state." />
          <Row label="Starting fresh" desc="Game menu → New Game resets your board at any time. The import wizard re-appears so you can load a new deck." />
        </Section>

        <Section title="About">
          <p className="text-xs text-gray-500 leading-relaxed">
            Made by{' '}
            <a
              href="https://www.linkedin.com/in/jkielsgaard/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              Jesper Kielsgaard
            </a>
            . Source code on{' '}
            <a
              href="https://github.com/jkielsgaard/vPlaymat"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              GitHub
            </a>
            . Version v1.4.5.
          </p>
        </Section>

        <Section title="Attribution">
          <p className="text-xs text-gray-500 leading-relaxed">
            Card data and images are provided by{' '}
            <a
              href="https://scryfall.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              Scryfall
            </a>
            . Magic: The Gathering is a trademark of Wizards of the Coast LLC.
            vPlaymat is a non-commercial personal tool and is not affiliated with either.
          </p>
        </Section>
      </div>
    </div>
  )
}
