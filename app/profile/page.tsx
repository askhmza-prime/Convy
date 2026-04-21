'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [username, setUsername] = useState('')
  const router = useRouter()

  async function saveProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !username) return

    await supabase.from('profiles').upsert({
      id: user.id,
      username,
    })

    router.push('/home')
  }

  return (
    <main className="h-screen flex items-center justify-center bg-black text-white">
      <div className="flex flex-col gap-4 w-[80%] max-w-sm">

        <h1 className="text-xl font-semibold text-center">
          Set your username
        </h1>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          className="bg-[#111] p-3 rounded outline-none"
        />

        <button
          onClick={saveProfile}
          className="bg-white text-black p-3 rounded"
        >
          Save
        </button>

      </div>
    </main>
  )
}
