interface LifeCounterProps {
  life: number
  onAdjust: (delta: number) => void
}

export function LifeCounter({ life, onAdjust }: LifeCounterProps) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        aria-label="-"
        className="w-6 h-6 rounded-full bg-felt border border-gold/40 text-gold font-bold hover:bg-felt-light transition-colors flex items-center justify-center text-base leading-none"
        onClick={() => onAdjust(-1)}
      >−</button>
      <div className="flex flex-col items-center leading-none">
        <span className={`font-bold tabular-nums ${life <= 5 ? 'text-red-400' : 'text-white'}`}
          style={{ fontSize: 32, lineHeight: 1 }}>
          {life}
        </span>
        <span className="text-gold text-[9px] font-semibold tracking-widest uppercase mt-0.5">Life</span>
      </div>
      <button
        aria-label="+"
        className="w-6 h-6 rounded-full bg-felt border border-gold/40 text-gold font-bold hover:bg-felt-light transition-colors flex items-center justify-center text-base leading-none"
        onClick={() => onAdjust(1)}
      >+</button>
    </div>
  )
}
