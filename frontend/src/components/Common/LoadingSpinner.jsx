// components/Common/LoadingSpinner.jsx
// Reusable loading spinner

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="inline-block">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        </div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}
