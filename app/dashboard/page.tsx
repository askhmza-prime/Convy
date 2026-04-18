'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [roomCode, setRoomCode] = useState('')

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }

    getUser()
  }, [])

  async function createRoom() {
    if (!user) return

    const { data, error } = await supabase
      .from('rooms')
      .insert([
        {
          name: 'My Room',
          created_by: user.id,
        },
      ])
      .select()

    if (error) {
      alert(error.message)
    } else {
      window.location.href = `/room/${data[0].id}`
    }
  }

  async function joinRoom() {
    if (!roomCode) return alert('Enter room code')

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomCode)
      .single()

    if (error || !data) {
      alert('Room not found')
    } else {
      window.location.href = `/room/${data.id}`
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-white">
      <h1 className="text-2xl font-bold mb-6">
        Welcome {user?.email || 'User'}
      </h1>

      {/* CREATE ROOM */}
      <button
        onClick={createRoom}
        className="bg-white text-black px-4 py-2 rounded-lg mb-6"
      >
        Create Room
      </button>

      {/* JOIN ROOM */}
      <input
        placeholder="Enter room code"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        className="bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg mb-4"
      />

      <button
        onClick={joinRoom}
        className="bg-white text-black px-4 py-2 rounded-lg"
      >
        Join Room
      </button>
    </main>
  )
}
