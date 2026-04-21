'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [rooms, setRooms] = useState<any[]>([])
  const router = useRouter()

  // 🔥 Fetch rooms with last message
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

      // sort latest chats on top
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
    <main className="h-screen bg-[#0a0a0a] text-white">

      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <h1 className="text-xl font-semibold">Chats</h1>
      </div>

      {/* Chat List */}
      <div className="flex flex-col">
        {rooms.map((room) => {
          const time = new Date(room.lastTime).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })

          return (
            <div
              key={room.id}
              onClick={() => router.push(`/room/${room.id}`)}
              className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#111] cursor-pointer active:scale-[0.98]"
            >
              <div className="flex flex-col">
                <p className="text-sm font-semibold">Room</p>
                <p className="text-xs text-gray-400 truncate max-w-[220px]">
                  {room.lastMessage}
                </p>
              </div>

              <span className="text-[10px] text-gray-500">
                {time}
              </span>
            </div>
          )
        })}
      </div>

    </main>
  )
}
