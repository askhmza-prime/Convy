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

  const channelRef = useRef<any>(null)

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, last_seen')

    const map: any = {}
    data?.forEach((u: any) => {
      map[u.id] = u
    })

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

  // 🔥 DELETE MESSAGE
  async function deleteMessage(messageId: string, senderId: string) {
    if (senderId !== userId) {
      alert('You can only delete your own messages')
      return
    }

    await supabase.from('messages').delete().eq('id', messageId)
  }

  function handleTyping() {
    if (!channelRef.current || !userId) return

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: userId },
    })

    clearTimeout((window as any).typingTimer)

    ;(window as any).typingTimer = setTimeout(() => {
      channelRef.current.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { user_id: userId },
      })
    }, 1500)
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

      channel = supabase.channel(`room-${id}`, {
        config: { presence: { key: user.id } },
      })

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setOnlineUsers(Object.keys(state))
      })

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

      channel.on('broadcast', { event: 'typing' }, (payload: any) => {
        if (payload.payload.user_id !== user.id) {
          setTypingUser(payload.payload.user_id)
        }
      })

      channel.on('broadcast', { event: 'stop_typing' }, () => {
        setTypingUser(null)
      })

      channel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id })
        }
      })

      channelRef.current = channel
    }

    init()

    return () => {
      if (userId) {
        supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', userId)
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [id])

  return (
    <main className="h-screen flex flex-col bg-black text-white">

      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <h1 className="text-lg font-semibold">Room</h1>

        <div className="text-xs mt-1 space-y-1">
          {memberIds.map((uid) => {
            const user = userMap[uid]
            const isOnline = onlineUsers.includes(uid)

            return (
              <p key={uid}>
                {user?.username || 'User'} •{' '}
                <span className={isOnline ? 'text-green-400' : ''}>
                  {isOnline ? 'online' : 'offline'}
                </span>
              </p>
            )
          })}
        </div>

        {typingUser && (
          <p className="text-xs text-yellow-400 mt-2">
            {userMap[typingUser]?.username || 'Someone'} is typing...
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg) => {
          const isMe = msg.user_id === userId
          const username = userMap[msg.user_id]?.username || 'User'

          const time = new Date(msg.created_at).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })

          const seenUsers = seenMap[msg.id] || []

          return (
            <div
              key={msg.id}
              onDoubleClick={() => deleteMessage(msg.id, msg.user_id)}
              className={`max-w-[70%] p-3 rounded ${
                isMe ? 'bg-white text-black self-end' : 'bg-[#111] self-start'
              }`}
            >
              <div className="flex justify-between text-[10px] opacity-60 mb-1">
                <span>{isMe ? 'You' : username}</span>
                <span>{time}</span>
              </div>

              <p className="text-sm">{msg.content}</p>

              {isMe && (
                <p className="text-[10px] opacity-50 mt-1">
                  {seenUsers.length > 1 ? 'Seen' : 'Sent'}
                </p>
              )}
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
