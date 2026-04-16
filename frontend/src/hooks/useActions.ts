// Thin wrapper that exposes all REST game actions as a single hook return value.
import * as api from '../api/rest'

export function useActions() {
  return {
    importDeck: api.importDeck,
    drawCards: api.drawCards,
    shuffleLibrary: api.shuffleLibrary,
    untapAll: api.untapAll,
    adjustLife: api.adjustLife,
    mulligan: api.mulligan,
    revealTop: api.revealTop,
    tapCard: api.tapCard,
    moveCard: api.moveCard,
    updatePosition: api.updatePosition,
    addCounter: api.addCounter,
    nextTurn: api.nextTurn,
    searchTokens: api.searchTokens,
    createToken: api.createToken,
    scryDecide: api.scryDecide,
    adjustPoison: api.adjustPoison,
    removeAllCounters: api.removeAllCounters,
    flipCard: api.flipCard,
    transformCard: api.transformCard,
    resetCommanderReturns: api.resetCommanderReturns,
  }
}
