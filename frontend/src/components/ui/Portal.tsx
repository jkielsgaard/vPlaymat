// Portal wrapper — renders children into document.body to escape any CSS stacking contexts.
import { createPortal } from 'react-dom'

interface PortalProps {
  children: React.ReactNode
}

export function Portal({ children }: PortalProps) {
  return createPortal(children, document.body)
}
