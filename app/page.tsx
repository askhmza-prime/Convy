export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Convy</h1>
        <p className="text-gray-400">Private chat for small groups.</p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/login"
            className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-gray-200"
          >
            Login
          </a>
          <a
            href="/signup"
            className="border border-white text-white px-6 py-2 rounded-lg font-medium hover:bg-white hover:text-black"
          >
            Sign Up
          </a>
        </div>
      </div>
    </main>
  )
}
