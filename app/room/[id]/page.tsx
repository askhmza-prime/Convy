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
    <main className="min-h-screen p-4 text-white flex flex-col">
      <h1 className="text-xl font-bold mb-4">Room: {id}</h1>

      {/* Messages */}
      <div className="flex-1 border p-3 mb-4 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2">
            {msg.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type message..."
          className="flex-1 p-2 text-black"
        />
        <button onClick={sendMessage} className="bg-white text-black px-4">
          Send
        </button>
      </div>
    </main>
  )
}
