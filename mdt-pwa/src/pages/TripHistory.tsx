export default function TripHistory() {
  return (
    <div className="min-h-screen bg-dark p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-6">Trip History</h1>
        
        <div className="bg-dark-lighter rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-4">No active trips</p>
          <p className="text-gray-500 text-sm">
            When you receive an assignment, it will appear here
          </p>
        </div>
      </div>
    </div>
  )
}
