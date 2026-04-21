'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [rooms, setRooms] = useState<any[]>([])
  const router = useRouter()

  // 🔥 Fetch rooms + last messages
  async function fetchRooms() {
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('*')

    const { data: messages } = await supabase
      .from('messages')
      .select('*')

    if (!roomsData) return

    const formatted = roomsData.map((room: any) => {
      const roomMsgs = messages?.filter(
        (m: any) => m.room_id === room.id
      )

      const lastMsg = roomMsgs?.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )[0]

      return {
        id: room.id,
        name: room.name,
        lastMessage: lastMsg?.content || 'No messages yet',
        lastTime: lastMsg?.created_at || room.created_at,
      }
    })

    formatted.sort(
      (a: any, b: any) =>
        new Date(b.lastTime).getTime() -
        new Date(a.lastTime).getTime()
    )

    setRooms(formatted)
  }

  // 🔥 Create room
  async function createRoom() {
    const roomName = prompt('Enter room name')

    if (!roomName) return

    const { data, error } = await supabase
      .from('rooms')
      .insert({ name: roomName })
      .select()
      .single()

    if (!error && data) {
      router.push(`/room/${data.id}`)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  return (
    <main className="h-screen bg-[#0a0a0a] text-white">

      {/* Header */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Chats</h1>

        <button
          onClick={createRoom}
          className="bg-white text-black px-3 py-1 rounded text-sm"
        >
          + New
        </button>
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
                <p className="text-sm font-semibold">
                  {room.name || 'Room'}
                </p>

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
