// Poison counter — +/− buttons tracking infect/poison counters with read-only spectator mode.
interface PoisonCounterProps {
  count: number
  onAdjust: (delta: number) => void
  readOnly?: boolean
}

export function PoisonCounter({ count, onAdjust, readOnly = false }: PoisonCounterProps) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {!readOnly && (
        <button
          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-felt rounded text-sm font-bold leading-none"
          onClick={() => onAdjust(-1)}
        >−</button>
      )}
      <div className="flex flex-col items-center leading-none">
        <span className={`font-bold tabular-nums text-xl ${count >= 10 ? 'text-red-400' : count > 0 ? 'text-green-400' : 'text-gray-400'}`}
          style={{ lineHeight: 1 }}>
          {count}
        </span>
        <span className="text-green-500/70 text-[9px] font-semibold tracking-widest uppercase mt-0.5">Poison</span>
      </div>
      {!readOnly && (
        <button
          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-felt rounded text-sm font-bold leading-none"
          onClick={() => onAdjust(1)}
        >+</button>
      )}
    </div>
  )
}
