interface DisclaimerModalProps {
  onAccept: () => void
}

export function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-mtg-card border border-gold/40 rounded-xl p-8 max-w-lg w-full shadow-2xl">
        <h1 className="text-gold font-bold text-2xl mb-1 tracking-wide">Welcome to vPlaymat</h1>
        <p className="text-gray-400 text-xs mb-6">MTG Virtual Playmat — please read before continuing</p>

        <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
          <p>
            vPlaymat is a personal, non-commercial tool for use during online Magic: The Gathering games.
            It is not affiliated with, endorsed by, or connected to Wizards of the Coast.
          </p>
          <p>
            Magic: The Gathering, its card names, and all related IP are trademarks of{' '}
            <strong className="text-gray-100">Wizards of the Coast LLC</strong>.
            Card images and data are provided by{' '}
            <strong className="text-gray-100">Scryfall</strong> under their{' '}
            <a
              href="https://scryfall.com/docs/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              API terms
            </a>
            . This application is non-commercial and makes no claim of ownership over any card artwork.
          </p>
          <p>
            By using vPlaymat you confirm you own or have the right to use the cards you import, and that
            you will use the application only for personal, non-commercial play.
          </p>
        </div>

        <button
          className="mt-8 w-full py-3 bg-gold text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors text-sm tracking-wide"
          onClick={onAccept}
        >
          I understand — let me play
        </button>
      </div>
    </div>
  )
}
