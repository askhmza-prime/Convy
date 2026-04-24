'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RoomPage() {
  const { id } = useParams()

  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [userMap, setUserMap] = useState<any>({})
  const [members, setMembers] = useState<string[]>([])

  // 🔐 Get current user
  async function getUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) setUserId(user.id)
  }

  // 🔥 Join room
  async function joinRoom(userId: string) {
    await supabase.from('room_members').upsert({
      room_id: id,
      user_id: userId,
    })
  }

  // 🔥 Fetch users (username map)
  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, username')

    const map: any = {}
    data?.forEach((u: any) => {
      map[u.id] = u.username
    })

    setUserMap(map)
    return map
  }

  // 🔥 Fetch members of this room
  async function fetchMembers(map: any) {
    const { data } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', id)

    if (!data) return

    const names = data.map((m: any) => map[m.user_id] || 'User')
    setMembers(names)
  }

  // 🔥 Fetch messages
  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', id)
      .order('created_at', { ascending: true })

    if (data) setMessages(data)
  }

  // 🔥 Send message
  async function sendMessage() {
    if (!input.trim() || !userId) return

    await supabase.from('messages').insert({
      room_id: id,
      content: input,
      user_id: userId,
    })

    setInput('')
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      setUserId(user.id)

      // join room
      await joinRoom(user.id)

      // fetch everything
      const map = await fetchUsers()
      await fetchMembers(map)
      await fetchMessages()
    }

    init()

    const channel = supabase
      .channel('room-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${id}`,
        },
        () => fetchMessages()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <main className="h-screen flex flex-col bg-black text-white">

      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <h1 className="text-lg font-semibold">Room</h1>

        {/* 👥 Members */}
        <p className="text-xs text-gray-400 mt-1 truncate">
          {members.join(', ')}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg) => {
          const isMe = msg.user_id === userId
          const username = userMap[msg.user_id] || 'User'

          const time = new Date(msg.created_at).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })

          return (
            <div
              key={msg.id}
              className={`max-w-[70%] p-3 rounded ${
                isMe
                  ? 'bg-white text-black self-end'
                  : 'bg-[#111] self-start'
              }`}
            >
              <div className="flex justify-between text-[10px] opacity-60 mb-1">
                <span>{isMe ? 'You' : username}</span>
                <span>{time}</span>
              </div>

              <p className="text-sm">{msg.content}</p>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-[#111] p-2 rounded outline-none"
          placeholder="Type message..."
        />

        <button
          onClick={sendMessage}
          className="bg-white text-black px-4 rounded"
        >
          Send
        </button>
      </div>

    </main>
  )
        }
