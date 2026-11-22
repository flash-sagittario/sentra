import { useEffect } from 'react'

// Sets the browser tab title while the calling page is mounted, then puts the previous
// title back. The sign-in page needs no call: index.html already holds "Sign In | Sentra".
export default function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
