export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 dark:text-white mb-4">
          Hello World!
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Welcome to your Next.js app
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Ready for deployment on Vercel
        </div>
      </div>
    </div>
  );
}
