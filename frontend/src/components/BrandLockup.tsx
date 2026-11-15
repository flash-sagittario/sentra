import BrandMark from './BrandMark'

export default function BrandLockup({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-[9px]">
      <BrandMark size={size} />
      <span className="font-display font-black text-[17px] leading-none relative [top:-0.03em]">sentra</span>
    </span>
  )
}

// contains both the logo and the sentra text. It loads the logo from the BrandMark.