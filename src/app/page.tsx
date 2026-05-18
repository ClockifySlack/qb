export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 font-sans p-4">
      <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center border border-gray-100">
        <h1 className="text-2xl font-bold mb-2 text-gray-800">QuickBooks Payroll Bridge</h1>
        <p className="text-gray-600 text-sm mb-6">
          A seamless integration add-on for the CAKE.com Marketplace connecting Clockify with QuickBooks.
        </p>
        <div className="text-xs text-gray-400 bg-gray-100 p-3 rounded-lg border border-gray-200 inline-block w-full">
          Status: Operational
        </div>
      </div>
    </div>
  );
}
