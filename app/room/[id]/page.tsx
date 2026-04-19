'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RoomPage() {
  const { id } = useParams()

  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ✅ Get current user
  async function getUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUserId(user?.id || null)
  }

  // ✅ Fetch old messages
  async function fetchMessages() {
    if (!id) return
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', id)
      .order('created_at', { ascending: true })
    if (!error && data) setMessages(data)
  }

  // ✅ Send message — FIX 1: Instant UI update
  async function sendMessage() {
  if (!newMessage.trim()) return

  const messageText = newMessage.trim()   // ✅ lock value

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const tempMessage = {
    id: crypto.randomUUID(),
    room_id: id,
    user_id: user?.id,
    content: messageText,
    created_at: new Date().toISOString(),
  }

  setMessages((prev) => [...prev, tempMessage])
  setNewMessage('')

  await supabase.from('messages').insert({
    room_id: id,
    user_id: user?.id,
    content: messageText,
  })
  }

  // ✅ Handle Enter key
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') sendMessage()
  }

  // ✅ Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ✅ Load + Realtime
  useEffect(() => {
    if (!id) return

    getUser()
    fetchMessages()

    const channel = supabase
      .channel('room-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${id}`,
        },
        (payload) => {
          // FIX 2 — Prevent duplicates
          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === payload.new.id)
            if (exists) return prev
            return [...prev, payload.new]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  return (
    <main className="h-screen flex flex-col bg-[#0a0a0a] text-white">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-[#111111] border-b border-white/5 shadow-sm">
        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
          #
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-none">Room</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{id}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-sm">No messages yet. Say hello 👋</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isMe = msg.user_id === userId

          // FIX 3 — Correct time format
          const time = new Date(msg.created_at).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })

          const prevMsg = messages[index - 1]
          const isSameUser = prevMsg && prevMsg.user_id === msg.user_id
          const topSpacing = isSameUser ? 'mt-0.5' : 'mt-3'

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${topSpacing}`}
            >
              <div
                className={`
                  relative max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                  transition-all duration-200
                  ${isMe
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-[#1e1e1e] text-gray-100 rounded-bl-sm border border-white/5'
                  }
                `}
              >
                <p className="break-words">{msg.content}</p>
                <span
                  className={`block text-[10px] mt-1 text-right ${
                    isMe ? 'text-indigo-200' : 'text-gray-500'
                  }`}
                >
                  {time}
                </span>
              </div>
            </div>
          )
        })}

        {/* Auto scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className="px-4 py-3 bg-[#111111] border-t border-white/5">
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 flex-shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 rotate-90"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>

    </main>
  )
}
