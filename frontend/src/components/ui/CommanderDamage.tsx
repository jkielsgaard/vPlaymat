import { addCommanderDamage } from '../../api/rest'

interface CommanderDamageProps {
  commanderDamage: Record<string, number>
  opponentNames: string[]
  onLoss?: (source: string) => void
  onLog?: (message: string) => void
  readOnly?: boolean
}

export function CommanderDamage({ commanderDamage, opponentNames, onLoss, onLog, readOnly = false }: CommanderDamageProps) {
  async function handleDelta(source: string, amount: number) {
    const result = await addCommanderDamage(source, amount)
    if (result.commander_loss) {
      onLoss?.(result.commander_loss)
    }
    onLog?.(`Commander damage from ${source}: ${amount > 0 ? '+' : ''}${amount} (total: ${result.total})`)
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-gold text-[10px] font-semibold tracking-widest uppercase whitespace-nowrap">Cmd dmg</span>
      {opponentNames.map((source) => {
        const dmg = commanderDamage[source] ?? 0
        const isLethal = dmg >= 21
        return (
          <div key={source} className="flex flex-col items-center gap-0.5">
            <span className="text-gray-400 text-[9px] leading-none truncate max-w-[56px]">{source}</span>
            <div className="flex items-center gap-0.5">
              {!readOnly && (
                <button
                  className="w-4 h-4 text-[10px] bg-felt border border-gold/30 text-gold rounded hover:bg-felt-light leading-none flex items-center justify-center"
                  onClick={() => handleDelta(source, -1)}
                >−</button>
              )}
              <span className={`text-xs font-bold w-6 text-center ${isLethal ? 'text-red-400' : 'text-white'}`}>
                {dmg}
              </span>
              {!readOnly && (
                <button
                  className="w-4 h-4 text-[10px] bg-felt border border-gold/30 text-gold rounded hover:bg-felt-light leading-none flex items-center justify-center"
                  onClick={() => handleDelta(source, 1)}
                >+</button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
