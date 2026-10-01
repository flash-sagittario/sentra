import { useState, type SubmitEvent } from 'react'
import { z } from 'zod'
import { supabase } from '../lib/supabase'

const GENERIC_ERROR = 'Invalid email or password. Please try again.'

const signInSchema = z.object({
  email: z.email({
    error: (issue) =>
      issue.input === '' ? 'Enter your email.' : 'Enter a valid email address.',
  }),
  password: z.string().min(1, { error: 'Enter your password.' }),
})

const BASE_INPUT_CLASSES =
  'w-full h-[52px] pl-[46px] bg-signin-raised text-signin-text border rounded-xl font-ui font-normal text-base outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-signin-muted motion-reduce:transition-none'

function inputStateClasses(isInvalid: boolean) {
  return isInvalid
    ? 'border-signin-error shadow-[0_0_0_3px_rgba(229,72,77,0.25)]'
    : 'border-signin-border hover:border-signin-border-strong focus:border-signin-primary focus:shadow-[0_0_0_3px_rgba(255,90,31,0.25)]'
}

function BrandMark() {
  return (
    <svg className="w-[26px] h-[26px] flex-none" viewBox="16 16 64 64" aria-hidden="true">
      <circle cx="34" cy="34" r="12.6" fill="#FF5A1F" />
      <g fill="none" stroke="#EDEDED" strokeWidth="3.2">
        <circle cx="62" cy="34" r="11" />
        <circle cx="34" cy="62" r="11" />
        <circle cx="62" cy="62" r="11" />
      </g>
    </svg>
  )
}

function MailIcon() {
  return (
    <svg
      className="absolute left-4 top-1/2 w-[18px] h-[18px] -translate-y-1/2 text-signin-muted pointer-events-none transition-colors duration-150 group-focus-within:text-signin-primary motion-reduce:transition-none"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg
      className="absolute left-4 top-1/2 w-[18px] h-[18px] -translate-y-1/2 text-signin-muted pointer-events-none transition-colors duration-150 group-focus-within:text-signin-primary motion-reduce:transition-none"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invalidField, setInvalidField] = useState<'email' | 'password' | null>(null)
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null)

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()

    // Shape/format checks run first, before touching the network.
    const parsed = signInSchema.safeParse({ email, password })
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      setError(issue.message)
      // Any Zod issue is tied to one field, the generic auth error later isn't.
      setInvalidField(issue.path[0] as 'email' | 'password')
      return
    }

    setError(null)
    setInvalidField(null)
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword(parsed.data)

    setLoading(false)

    // Generic message on any auth failure, never Supabase's raw error text.
    // Keeps a wrong password and a nonexistent account indistinguishable.
    if (authError || !data.user) {
      setError(GENERIC_ERROR)
      return
    }

    setSignedInEmail(data.user.email ?? email)
  }

  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-signin-bg text-signin-text font-ui antialiased pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] [color-scheme:dark]">
      <div
        className="max-[450px]:hidden fixed inset-0 overflow-hidden pointer-events-none [-webkit-mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,#000_15%,transparent_75%)] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,#000_15%,transparent_75%)]"
        aria-hidden="true"
      >
        <div className="absolute -inset-[70px] [background-image:radial-gradient(rgba(255,255,255,0.18)_1.2px,transparent_1.5px)] [background-size:22px_22px] will-change-transform animate-signin-drift motion-reduce:animate-none" />
      </div>

      <a
        className="fixed z-10 inline-flex items-center gap-[9px] text-signin-text no-underline [left:44px] max-[450px]:[left:24px] [top:calc(env(safe-area-inset-top,0px)+28px)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:rounded-md focus-visible:outline-signin-text"
        href="#"
      >
        <BrandMark />
        <span className="font-display font-black text-[17px] leading-none relative [top:-0.03em]">sentra</span>
      </a>

      <main className="relative flex-1 flex items-center justify-center py-12 px-6 max-[450px]:px-0">
        <div className="w-full max-w-[440px] max-[450px]:max-w-none max-[450px]:rounded-none max-[450px]:border-x-0 max-[450px]:px-6 p-10 bg-signin-card [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_3px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_3px)] border border-signin-border rounded-[20px] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          <h1 className="m-0 mb-2.5 text-signin-text font-ui font-bold text-3xl leading-tight tracking-[-0.01em]">Sign in</h1>
          <p className="m-0 mb-[14px] text-signin-text-dim text-base leading-normal max-w-[32ch]">
            Search documents your role can access.
          </p>
          <hr className="border-0 border-t border-signin-border m-0 mb-7" />

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-6">
              <label htmlFor="email" className="block mb-2 font-mono text-sm text-signin-text-dim">
                Email
              </label>
              <div className="relative group">
                <MailIcon />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="role@sentra.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${BASE_INPUT_CLASSES} pr-4 ${inputStateClasses(invalidField === 'email')}`}
                />
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block mb-2 font-mono text-sm text-signin-text-dim">
                Password
              </label>
              <div className="relative group">
                <LockIcon />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${BASE_INPUT_CLASSES} pr-[52px] ${inputStateClasses(invalidField === 'password')}`}
                />
                <button
                  type="button"
                  className="absolute right-1.5 top-1.5 w-10 h-10 grid place-items-center bg-transparent border-0 rounded-lg text-signin-muted cursor-pointer hover:text-signin-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-signin-text focus-visible:outline-offset-0"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <a className="block mb-9 text-signin-text-dim text-sm no-underline hover:text-signin-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-signin-text focus-visible:outline-offset-[3px] focus-visible:rounded" href="#">
              Forgot your password?
            </a>

            {error && (
              <p className="flex items-center gap-2.5 m-0 mb-5 text-signin-error text-sm leading-[1.45]" role="alert">
                <span className="flex-none font-bold text-base leading-[1.45]" aria-hidden="true">
                  |
                </span>
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] flex items-center justify-center gap-3 bg-signin-primary text-signin-bg border-0 rounded-full font-ui font-semibold text-base cursor-pointer [transition:background-color_0.15s,transform_0.1s] hover:bg-signin-primary-hover active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signin-text focus-visible:outline-offset-[3px] disabled:cursor-progress motion-reduce:transition-none"
            >
              <span>{loading ? 'Signing in' : 'Sign in'}</span>
              <span className={`${loading ? 'inline-flex' : 'hidden'} gap-[5px]`} aria-hidden="true">
                <i className="w-1.5 h-1.5 rounded-full bg-signin-bg animate-signin-blink motion-reduce:animate-none motion-reduce:opacity-60" />
                <i className="w-1.5 h-1.5 rounded-full bg-signin-bg animate-signin-blink motion-reduce:animate-none motion-reduce:opacity-60 [animation-delay:150ms]" />
                <i className="w-1.5 h-1.5 rounded-full bg-signin-bg animate-signin-blink motion-reduce:animate-none motion-reduce:opacity-60 [animation-delay:300ms]" />
              </span>
            </button>
          </form>
        </div>
      </main>

      {signedInEmail && (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-6 bg-black/55" role="dialog" aria-modal="true" aria-label="Signed in">
          <div className="w-full max-w-[360px] p-8 text-center bg-signin-card border border-signin-border rounded-[20px] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            <div className="grid place-items-center w-12 h-12 mx-auto mb-[18px] rounded-full bg-[rgba(62,207,142,0.12)] text-signin-success">
              <CheckIcon />
            </div>
            <p className="m-0 mb-6 text-base text-signin-text">
              Signed in.
              <span className="text-signin-text-dim font-mono text-sm block mt-1.5 break-all">{signedInEmail}</span>
            </p>
            <button
              type="button"
              className="w-full h-11 bg-signin-raised text-signin-text border border-signin-border rounded-full font-ui font-semibold text-[15px] cursor-pointer hover:border-signin-border-strong"
              onClick={() => setSignedInEmail(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
