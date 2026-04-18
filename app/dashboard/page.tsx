'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }

    getUser()
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-white">
      <h1 className="text-2xl font-bold mb-6">
        Welcome {user?.email || 'User'}
      </h1>

      <button className="bg-white text-black px-4 py-2 rounded-lg mb-4">
        Create Room
      </button>

      <input
        placeholder="Enter room code"
        className="bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg"
      />
    </main>
  )
}
