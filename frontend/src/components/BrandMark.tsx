export default function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} className="flex-none" viewBox="16 16 64 64" aria-hidden="true">
      <circle cx="34" cy="34" r="12.6" className="fill-app-primary" />
      <g fill="none" stroke="#EDEDED" strokeWidth="3.2">
        <circle cx="62" cy="34" r="11" />
        <circle cx="34" cy="62" r="11" />
        <circle cx="62" cy="62" r="11" />
      </g>
    </svg>
  )
}

// contains the logo all 4 dots, excluding the sentra text. 