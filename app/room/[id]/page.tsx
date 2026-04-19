'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RoomPage() {
  const { id } = useParams()

  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

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

  // ✅ Send message
  async function sendMessage() {
    if (!newMessage) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('messages').insert({
      room_id: id,
      user_id: user?.id,
      content: newMessage,
    })

    setNewMessage('')
    // ❌ NO fetchMessages here (realtime handles it)
  }

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
          filter: `room_id=eq.${id}`, // 🔥 IMPORTANT FIX
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  return (
    <main className="h-screen flex flex-col text-white bg-black">

      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <h1 className="font-bold">Room: {id}</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => {
          const isMe = msg.user_id === userId

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-2 rounded-lg ${
                  isMe
                    ? 'bg-green-500 text-black'
                    : 'bg-gray-800 text-white'
                }`}
              >
                <p>{msg.content}</p>

                <span className="text-xs opacity-60">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-700 flex gap-2 bg-black">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type message..."
          className="flex-1 p-3 rounded-full text-black outline-none"
        />
        <button
          onClick={sendMessage}
          className="bg-green-500 px-5 rounded-full"
        >
          ➤
        </button>
      </div>

    </main>
  )
        }
