'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RoomPage() {
  const { id } = useParams()

  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')

  // ✅ Fetch messages
  async function fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', id)
      .order('created_at', { ascending: true })

    if (!error) setMessages(data)
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
    fetchMessages()
  }

  // Load messages on start
  useEffect(() => {
    fetchMessages()
  }, [])

return (
  <main className="h-screen flex flex-col text-white">

    {/* Header */}
    <div className="p-3 border-b">
      <h1 className="font-bold">Room: {id}</h1>
    </div>

    {/* Messages */}
    <div className="flex-1 overflow-y-auto p-3">
      {messages.map((msg) => (
        <div key={msg.id} className="mb-2">
          {msg.content}
        </div>
      ))}
    </div>

    {/* Input (always fixed at bottom) */}
    <div className="p-3 border-t flex gap-2">
      <input
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type message..."
        className="flex-1 p-2 text-black"
      />
      <button
        onClick={sendMessage}
        className="bg-white text-black px-4"
      >
        Send
      </button>
    </div>

  </main>
)
