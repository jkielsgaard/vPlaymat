interface ReleaseNotesPanelProps {
  onClose: () => void
}

function Version({ version, date, children }: { version: string; date: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-2">
        <h3 className="text-gold text-sm font-semibold font-mono">{version}</h3>
        <span className="text-gray-600 text-xs">{date}</span>
      </div>
      <ul className="space-y-1">
        {children}
      </ul>
    </section>
  )
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-xs text-gray-400 leading-relaxed">
      <span className="text-gold/50 shrink-0 mt-0.5">–</span>
      <span>{children}</span>
    </li>
  )
}

export function ReleaseNotesPanel({ onClose }: ReleaseNotesPanelProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 flex items-stretch justify-end"
      onClick={onClose}
    >
      <div
        className="h-screen w-[520px] bg-mtg-card border-l border-gold/30 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-gold font-semibold text-lg">Release Notes</h2>
            <button
              aria-label="Close"
              className="text-gray-400 hover:text-gold text-xl leading-none"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <Version version="v1.4.2" date="April 2026">
            <Item>Welcome wizard now re-appears after starting a new game</Item>
            <Item>OG image added as a visual header in the import wizard</Item>
          </Version>

          <div className="border-t border-gold/10" />

          <Version version="v1.4.1" date="April 2026">
            <Item>SEO improvements — page title, meta description, Open Graph and Twitter Card tags, favicon, robots.txt, and sitemap</Item>
          </Version>

          <div className="border-t border-gold/10" />

          <Version version="v1.4.0" date="April 2026">
            <Item>Release Notes panel added to the Game menu</Item>
          </Version>

          <div className="border-t border-gold/10" />

          <Version version="v1.3.0" date="April 2026">
            <Item>Spectator view — renamed and expanded from "OBS URL"; now includes a left zone panel (library count, graveyard, exile)</Item>
            <Item>Hover card preview in spectator view — toggle, resize, and reposition via ⚙ in the top-right corner</Item>
            <Item>Multi-player sharing — share your Spectator URL with 2–4 players so everyone sees all boards live in their browser</Item>
            <Item>Zone viewer mirroring — when you open the graveyard or exile viewer, spectators see it automatically</Item>
            <Item>Settings → Spectator: allow spectators to browse zones independently</Item>
            <Item>Interactive controls (life, poison, commander damage, counters) hidden in spectator view</Item>
            <Item>Settings panel scrolling fixed</Item>
            <Item>Production: fixed session file permission error on container restart</Item>
          </Version>

          <div className="border-t border-gold/10" />

          <Version version="v1.1.0 – v1.1.1" date="March 2026">
            <Item>Live at vplaymat.com</Item>
            <Item>Settings defaults and ranges adjusted</Item>
            <Item>BETA badge added to the menu bar</Item>
          </Version>

          <div className="border-t border-gold/10" />

          <Version version="v1.0.1" date="March 2026">
            <Item>Demo deck button in the import wizard — try the app without a decklist</Item>
            <Item>Automated CI/CD pipeline (Docker build and deploy on push to main)</Item>
          </Version>

          <div className="border-t border-gold/10" />

          <Version version="v1.0.0" date="March 2026">
            <Item>Switched to semantic versioning</Item>
            <Item>Architecture and contribution documentation added</Item>
          </Version>

          <div className="border-t border-gold/10" />

          <Version version="Earlier" date="2025 – 2026">
            <Item>v2.2: OBS Browser Source view and streaming guide</Item>
            <Item>v1.9: Full beta release — all core gameplay features (drag &amp; drop, zones, counters, commander support)</Item>
            <Item>v1.8: Session isolation, persistence, and 15-minute expiry</Item>
            <Item>v1.5: Initial alpha release</Item>
          </Version>
        </div>
      </div>
    </div>
  )
}
