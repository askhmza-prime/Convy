'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function RoomPage() {
  const { id } = useParams()
  const supabase = createClient()

  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')

  // Fetch messages
  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', id)
      .order('created_at', { ascending: true })

    if (data) setMessages(data)
  }

  // Send message
  async function sendMessage() {
    if (!input) return

    await supabase.from('messages').insert({
      room_id: id,
      content: input,
    })

    setInput('')
    loadMessages()
  }

  useEffect(() => {
    loadMessages()
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-white">
      
      <h1 className="text-xl mb-4">Room: {id}</h1>

      <div className="w-full max-w-md border border-gray-700 p-4 mb-4 h-64 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2">
            {msg.content}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="bg-gray-900 border border-gray-700 px-3 py-2"
          placeholder="Type message..."
        />
        <button onClick={sendMessage} className="bg-white text-black px-4">
          Send
        </button>
      </div>

    </main>
  )
}
