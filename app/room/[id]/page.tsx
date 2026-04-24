'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RoomPage() {
  const { id } = useParams()

  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [userMap, setUserMap] = useState<any>({})
  const [members, setMembers] = useState<string[]>([])
  const [typingUser, setTypingUser] = useState<string | null>(null)

  const channelRef = useRef<any>(null)
  let typingTimeout: any

  // 🔐 Get user
  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)
  }

  // 🔥 Join room
  async function joinRoom(userId: string) {
    await supabase.from('room_members').upsert({
      room_id: id,
      user_id: userId,
    })
  }

  // 🔥 Fetch users
  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('id, username')

    const map: any = {}
    data?.forEach((u: any) => {
      map[u.id] = u.username
    })

    setUserMap(map)
    return map
  }

  // 🔥 Fetch members
  async function fetchMembers(map: any) {
    const { data } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', id)

    const names = data?.map((m: any) => map[m.user_id] || 'User')
    setMembers(names || [])
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

  // 🔥 Handle typing
  function handleTyping() {
    if (!channelRef.current || !userId) return

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: userId },
    })

    clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => {
      setTypingUser(null)
    }, 2000)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)
      await joinRoom(user.id)

      const map = await fetchUsers()
      await fetchMembers(map)
      await fetchMessages()
    }

    init()

    const channel = supabase.channel(`room-${id}`)

    // 🔥 Listen messages
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${id}`,
      },
      () => fetchMessages()
    )

    // 🔥 Listen typing
    channel.on('broadcast', { event: 'typing' }, (payload: any) => {
      if (payload.payload.user_id !== userId) {
        setTypingUser(payload.payload.user_id)
      }
    })

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <main className="h-screen flex flex-col bg-black text-white">

      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <h1 className="text-lg font-semibold">Room</h1>

        <p className="text-xs text-gray-400 truncate">
          {members.join(', ')}
        </p>

        {/* ✨ Typing */}
        {typingUser && (
          <p className="text-xs text-green-400 mt-1">
            {userMap[typingUser] || 'Someone'} is typing...
          </p>
        )}
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
          onChange={(e) => {
            setInput(e.target.value)
            handleTyping()
          }}
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
