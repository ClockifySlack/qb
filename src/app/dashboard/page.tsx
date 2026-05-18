export default function Dashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 font-sans p-4">
      <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center border border-gray-100">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ✓
        </div>
        <h2 className="text-2xl font-bold mb-2 text-gray-800">Connection Successful!</h2>
        <p className="text-gray-600 text-sm mb-6">
          Your QuickBooks account has been successfully linked. The integration bridge is active and ready to sync data.
        </p>
        <p className="text-xs text-gray-400">
          You can now safely close this window or return to Clockify.
        </p>
      </div>
    </div>
  );
}
