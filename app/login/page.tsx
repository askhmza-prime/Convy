'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm p-8 border border-gray-700 rounded-xl">
        <h2 className="text-2xl font-bold mb-6 text-center">Login to Convy</h2>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 mb-4 text-white"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 mb-6 text-white"
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-white text-black py-2 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <p className="text-center text-gray-400 text-sm mt-4">
          No account?{' '}
          <a href="/signup" className="text-white underline">Sign up</a>
        </p>
      </div>
    </main>
  )
}
