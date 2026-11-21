// Page texture shared by the chat area and the composer strip, so the composer and its
// top fade blend into the page. Kept as literal class strings so Tailwind can see them.
export const HATCH =
  '[background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_3px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_3px)]'

export const HATCH_BEFORE =
  'before:[background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_3px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_3px)]'

// Added to the composer only while it moves between the centred and bottom positions.
export const LIFT_TRANSITION = 'transition-transform duration-350 ease-lift'

export function clockTime() {
  return new Date().toTimeString().slice(0, 5)
}
