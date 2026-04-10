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
      <span className="text-gray-200 font-medium w-36 shrink-0">{label}</span>
      <span className="text-gray-400">{desc}</span>
    </div>
  )
}

export function HelpPanel({ onClose }: HelpPanelProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-end"
      onClick={onClose}
    >
      <div
        className="h-full w-80 bg-mtg-card border-l border-gold/30 p-6 overflow-y-auto flex flex-col gap-6"
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

        <Section title="Game menu">
          <Row label="New Game" desc="Reset the board (confirmation required)" />
          <Row label="Import New Deck" desc="Load a new deck in MTGA format" />
          <Row label="Game Log" desc="Toggle the action log panel below the arena" />
          <Row label="Copy OBS URL" desc="Copies a clean arena-only URL for OBS Browser Source — includes your session ID so it mirrors your game live" />
        </Section>

        <Section title="Streaming with OBS">
          <div className="text-xs text-gray-400 leading-relaxed space-y-3">

            <p className="text-gray-300 font-medium">Method 1 — Browser Source (recommended)</p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>Play normally in this browser window</li>
              <li>Game menu → <strong className="text-gray-200">Copy OBS URL</strong></li>
              <li>In OBS: add a <strong className="text-gray-200">Browser Source</strong></li>
              <li>Paste the URL and set <strong className="text-gray-200">Width × Height</strong> to match your arena size in Settings (default 1280 × 720)</li>
              <li>Click <strong className="text-gray-200">Start Virtual Camera</strong> in OBS</li>
              <li>Select <strong className="text-gray-200">OBS Virtual Camera</strong> in Spelltable / Discord</li>
            </ol>

            <p className="text-amber-400/80 text-[11px]">
              ⚠ Width &amp; Height in OBS must exactly match your arena size — if they differ you will see a cropped view or black bars.
            </p>

            <p className="text-[11px]">
              <strong className="text-gray-300">Black bar below the battlefield?</strong>{' '}
              Your OBS canvas is larger than the source. Fix: OBS → Settings → Video → set Base Resolution to <strong className="text-gray-200">1280 × 720</strong>, or right-click the source → <strong className="text-gray-200">Transform → Fit to screen</strong>.
            </p>

            <p className="text-gray-300 font-medium pt-1">Method 2 — Screen capture</p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>In OBS add a <strong className="text-gray-200">Window Capture</strong> source pointing at this browser window</li>
              <li>Add a <strong className="text-gray-200">Crop/Pad</strong> filter (right-click source → Filters) to cut to just the arena — crop out the menu bar at the top and everything below the arena border</li>
              <li>Enable Virtual Camera and select it in Spelltable / Discord</li>
            </ol>
            <p className="text-[11px]">
              Note: if you resize the browser window the crop will be off and needs re-adjusting.
            </p>

          </div>
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
