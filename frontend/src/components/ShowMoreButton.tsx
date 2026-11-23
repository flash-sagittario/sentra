import Icon from './Icon'

interface Props {
  expanded: boolean
  onClick: () => void
  /** primary: orange (answer bubble). soft: grey, for the question bubble's dark orange fill. */
  tone?: 'primary' | 'soft'
  className?: string
}

const TONES = {
  primary: 'text-app-primary/70 hover:text-app-primary',
  soft: 'text-app-text-dim hover:text-app-text',
}

export default function ShowMoreButton({ expanded, onClick, tone = 'primary', className = '' }: Props) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onClick}
      className={`-ml-2 inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-label font-semibold focus-visible:outline-2 focus-visible:outline-app-text ${TONES[tone]} ${className}`}
    >
      {expanded ? 'Show less' : 'Show more'}
      <Icon name={expanded ? 'chevU' : 'chevD'} size={14} />
    </button>
  )
}
