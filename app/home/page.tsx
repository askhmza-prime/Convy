'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [rooms, setRooms] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  // 🔥 Get current user
  async function getUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    setUserId(user?.id || null)
  }

  // 🔥 Fetch rooms
  async function fetchRooms() {
    const { data: roomsData } = await supabase.from('rooms').select('*')
    const { data: messages } = await supabase.from('messages').select('*')

    if (!roomsData) return

    const formatted = roomsData.map((room: any) => {
      const roomMsgs = messages?.filter((m: any) => m.room_id === room.id)

      const lastMsg = roomMsgs?.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )[0]

      const isMe = lastMsg?.user_id === userId

      return {
        id: room.id,
        name: room.name,
        lastMessage: lastMsg
          ? `${isMe ? 'You' : 'Other'}: ${lastMsg.content}`
          : 'No messages yet',
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

  useEffect(() => {
    getUser()
  }, [])

  useEffect(() => {
    if (userId !== null) {
      fetchRooms()
    }
  }, [userId])

  // 🔥 Create room
  async function createRoom() {
    const roomName = prompt('Enter room name')
    if (!roomName) return

    const { data } = await supabase
      .from('rooms')
      .insert({ name: roomName })
      .select()
      .single()

    if (data) {
      router.push(`/room/${data.id}`)
    }
  }

  // 🔥 Join room
  async function joinRoom() {
    let input = prompt('Paste invite link or room code')
    if (!input) return

    input = input.trim()

    if (input.includes('/room/')) {
      input = input.split('/room/')[1]
    }

    const { data, error } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', input)
      .single()

    if (error || !data) {
      alert('Room not found ❌')
      return
    }

    router.push(`/room/${input}`)
  }

  function copyInvite(roomId: string) {
    const link = `${window.location.origin}/room/${roomId}`
    navigator.clipboard.writeText(link)
    alert('Invite link copied!')
  }

  return (
    <main className="h-screen bg-[#0a0a0a] text-white">

      <div className="p-4 border-b border-white/5 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Chats</h1>

        <div className="flex gap-2">
          <button
            onClick={joinRoom}
            className="bg-[#222] px-3 py-1 rounded text-sm"
          >
            Join
          </button>

          <button
            onClick={createRoom}
            className="bg-white text-black px-3 py-1 rounded text-sm"
          >
            + New
          </button>
        </div>
      </div>

      <div className="flex flex-col">
        {rooms.map((room) => {
          const time = new Date(room.lastTime).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })

          return (
            <div
              key={room.id}
              className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#111]"
            >
              <div
                onClick={() => router.push(`/room/${room.id}`)}
                className="flex flex-col cursor-pointer"
              >
                <p className="text-sm font-semibold">
                  {room.name || 'Room'}
                </p>
                <p className="text-xs text-gray-400 truncate max-w-[200px]">
                  {room.lastMessage}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">
                  {time}
                </span>

                <button
                  onClick={() => copyInvite(room.id)}
                  className="text-xs bg-[#222] px-2 py-1 rounded"
                >
                  🔗
                </button>
              </div>
            </div>
          )
        })}
      </div>

    </main>
  )
}
