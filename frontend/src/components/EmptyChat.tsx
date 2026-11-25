import BrandMark from './BrandMark'

// On tablet and desktop the greeting sits just above the centred composer; on phones it is
// centred in the message area.
export default function EmptyChat() {
  return (
    <div className="my-auto flex items-center justify-center gap-3 py-6 dock:absolute dock:inset-x-0 dock:bottom-[calc(50%+24px)] dock:my-0 dock:px-8 dock:py-0">
      <BrandMark size={36} />
      <h3 className="min-w-0 text-center text-2xl leading-9 font-bold">What can I find for you?</h3>
    </div>
  )
}
