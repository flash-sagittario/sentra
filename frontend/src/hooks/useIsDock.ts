import { useSyncExternalStore } from 'react'

// Must match --breakpoint-dock in index.css (700px). Single source for every JS check.
export const DOCK_MIN_WIDTH = 700
// Not a CSS breakpoint. From this width up the sidebar and the sources panel can both be open;
// below it, opening one closes the other (same 1100px as the mockup).
export const SIDE_BY_SIDE_MIN_WIDTH = 1100

const DOCK_QUERY = `(min-width: ${DOCK_MIN_WIDTH}px)`
const WIDE_QUERY = `(min-width: ${SIDE_BY_SIDE_MIN_WIDTH}px)`

function subscribeTo(query: string) {
  return (onChange: () => void) => {
    const mq = window.matchMedia(query)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }
}

const subscribeDock = subscribeTo(DOCK_QUERY)
const subscribeWide = subscribeTo(WIDE_QUERY)

export default function useIsDock() {
  return useSyncExternalStore(
    subscribeDock,
    () => window.matchMedia(DOCK_QUERY).matches,
    () => true,
  )
}

export function useIsWide() {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  )
}
