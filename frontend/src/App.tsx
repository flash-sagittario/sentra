import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import SignIn from './pages/SignIn'
import Chat from './pages/Chat'
import QueryTest from './pages/QueryTest'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return null
  if (!session) return <SignIn />

  const showTest =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('view') === 'test'

  return showTest ? <QueryTest /> : <Chat session={session} />
}

export default App
