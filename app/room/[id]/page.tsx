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
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [seenMap, setSeenMap] = useState<any>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const channelRef = useRef<any>(null)

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, username')

    const map: any = {}
    data?.forEach((u: any) => (map[u.id] = u))
    setUserMap(map)
  }

  async function fetchMembers() {
    const { data } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', id)

    setMemberIds(data?.map((m: any) => m.user_id) || [])
  }

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', id)
      .order('created_at', { ascending: true })

    if (data) setMessages(data)
  }

  async function fetchSeen() {
    const { data } = await supabase
      .from('message_seen')
      .select('*')

    const map: any = {}
    data?.forEach((s: any) => {
      if (!map[s.message_id]) map[s.message_id] = []
      map[s.message_id].push(s.user_id)
    })

    setSeenMap(map)
  }

  async function markMessagesSeen(userId: string) {
    const { data } = await supabase
      .from('messages')
      .select('id')
      .eq('room_id', id)

    if (!data) return

    const inserts = data.map((m: any) => ({
      message_id: m.id,
      user_id: userId,
    }))

    await supabase.from('message_seen').upsert(inserts)
  }

  async function joinRoom(userId: string) {
    await supabase.from('room_members').upsert({
      room_id: id,
      user_id: userId,
    })
  }

  async function sendMessage() {
    if (!input.trim() || !userId) return

    await supabase.from('messages').insert({
      room_id: id,
      content: input,
      user_id: userId,
    })

    setInput('')
  }

  function startEdit(msg: any) {
    if (msg.user_id !== userId) return
    setEditingId(msg.id)
    setEditText(msg.content)
  }

  async function saveEdit() {
    if (!editingId) return

    const { error } = await supabase
      .from('messages')
      .update({ content: editText })
      .eq('id', editingId)

    if (error) return alert(error.message)

    setMessages((prev: any[]) =>
      prev.map((m) =>
        m.id === editingId ? { ...m, content: editText } : m
      )
    )

    setEditingId(null)
    setEditText('')
  }

  function handleTyping() {
    if (!channelRef.current || !userId) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: userId },
    })
  }

  useEffect(() => {
    let channel: any

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      await joinRoom(user.id)
      await fetchUsers()
      await fetchMembers()
      await fetchMessages()
      await markMessagesSeen(user.id)
      await fetchSeen()

      channel = supabase.channel(`room-${id}`)

      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${id}`,
        },
        async () => {
          await fetchMessages()
          await fetchSeen()
        }
      )

      channel.subscribe()
      channelRef.current = channel
    }

    init()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [id])

  return (
    <main className="h-screen flex flex-col bg-black text-white">

      <div className="p-4 border-b border-white/5">
        <h1 className="text-lg font-semibold">Room</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg) => {
          const isMe = msg.user_id === userId
          const seenUsers = seenMap[msg.id] || []

          // 🔥 TICKS LOGIC
          let status = '✓'

          if (memberIds.length > 1) {
            const others = memberIds.filter((id) => id !== userId)

            const someoneOnline = others.some((id) =>
              onlineUsers.includes(id)
            )

            const someoneSeen = others.some((id) =>
              seenUsers.includes(id)
            )

            if (someoneSeen) {
              status = '✓✓ (seen)'
            } else if (someoneOnline) {
              status = '✓✓'
            }
          }

          return (
            <div
              key={msg.id}
              onClick={() => startEdit(msg)}
              className={`max-w-[70%] p-3 rounded ${
                isMe ? 'bg-white text-black self-end' : 'bg-[#111]'
              }`}
            >
              {editingId === msg.id ? (
                <div className="flex gap-2">
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="bg-gray-200 text-black px-2 py-1 rounded flex-1"
                  />
                  <button onClick={saveEdit}>Save</button>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}

              {isMe && (
                <p className="text-[10px] mt-1 opacity-60">
                  {status}
                </p>
              )}
            </div>
          )
        })}
      </div>

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
