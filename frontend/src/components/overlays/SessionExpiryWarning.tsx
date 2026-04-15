interface SessionExpiryWarningProps {
  minutesLeft: number
  onExtend: () => void
}

export function SessionExpiryWarning({ minutesLeft, onExtend }: SessionExpiryWarningProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center">
      <div className="bg-mtg-card border border-amber-600/60 rounded-lg shadow-xl p-8 w-80 flex flex-col items-center gap-5 text-center">
        <div className="text-amber-400 text-3xl">⏳</div>
        <div>
          <h2 className="text-amber-300 text-base font-semibold mb-2">Session expiring soon</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Your board will be cleared in{' '}
            <span className="text-amber-200 font-medium">
              {minutesLeft} {minutesLeft === 1 ? 'minute' : 'minutes'}
            </span>{' '}
            due to inactivity.
          </p>
        </div>
        <button
          onClick={onExtend}
          className="w-full px-4 py-2 bg-amber-700/80 hover:bg-amber-600/80 text-amber-100 text-sm font-semibold rounded transition-colors"
        >
          Keep Playing
        </button>
      </div>
    </div>
  )
}
