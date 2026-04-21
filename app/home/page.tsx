'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [rooms, setRooms] = useState<any[]>([])
  const router = useRouter()

  async function fetchRooms() {
  const { data, error } = await supabase
    .from('rooms')
    .select(`
      id,
      created_at,
      messages (
        content,
        created_at
      )
    `)

  if (!error && data) {
    const formatted = data.map((room: any) => {
      const lastMsg = room.messages?.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]

      return {
        id: room.id,
        lastMessage: lastMsg?.content || 'No messages yet',
        lastTime: lastMsg?.created_at || room.created_at,
      }
    })

    formatted.sort(
      (a: any, b: any) =>
        new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
    )

    setRooms(formatted)
  }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  return (
    <main className="h-screen bg-[#0a0a0a] text-white p-4">

      <h1 className="text-xl font-semibold mb-4">Chats</h1>

      <div className="space-y-2">
        {rooms.map((room) => (
          <div
            key={room.id}
            onClick={() => router.push(`/room/${room.id}`)}
            className="p-4 bg-[#111] rounded-xl border border-white/5 cursor-pointer"
          >
            <p className="font-medium">Room</p>
            <p className="text-xs text-gray-500 truncate">
              {room.id}
            </p>
          </div>
        ))}
      </div>

    </main>
  )
}
