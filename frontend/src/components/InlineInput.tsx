import { useRef } from 'react'

interface Props {
  initial: string
  maxLength: number
  label: string
  placeholder?: string
  className?: string
  saveOnBlur?: boolean
  /** Called once. A string (trimmed, may be empty) means save; null means cancel. */
  onDone: (value: string | null) => void
}

export default function InlineInput({
  initial,
  maxLength,
  label,
  placeholder,
  className = '',
  saveOnBlur = true,
  onDone,
}: Props) {
  const done = useRef(false)

  function finish(value: string | null) {
    if (done.current) return
    done.current = true
    onDone(value)
  }

  return (
    <input
      autoFocus
      defaultValue={initial}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-label={label}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          const value = e.currentTarget.value.trim()
          if (!value && !saveOnBlur) return
          finish(value)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          finish(null)
        }
      }}
      onBlur={(e) => {
        if (saveOnBlur) finish(e.currentTarget.value.trim())
      }}
      className={`min-w-0 h-7 px-2 bg-app-raised border-0 rounded-md text-app-text font-ui text-sm outline-2 outline-app-primary ${className}`}
    />
  )
}
