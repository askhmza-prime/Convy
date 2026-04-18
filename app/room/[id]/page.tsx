export default function RoomPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen flex items-center justify-center text-white flex-col">
      <h1 className="text-2xl font-bold mb-2">Room</h1>
      <p className="text-gray-400">Room ID:</p>
      <p className="font-mono">{params.id}</p>
    </main>
  )
}
