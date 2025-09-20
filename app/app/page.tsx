export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          SQL Agent
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Backend: https://fetti-hackathon.onrender.com
        </p>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-gray-700">
            Frontend deployed successfully on Vercel!
          </p>
        </div>
      </div>
    </div>
  );
}