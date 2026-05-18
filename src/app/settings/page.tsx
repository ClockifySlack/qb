export default function Settings() {
  return (
    <div className="p-8 font-sans">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">QuickBooks Integration Settings</h2>
      <p className="mb-6 text-gray-600 text-sm">
        Click the button below to authorize this app to send invoices directly to your QuickBooks account.
      </p>
      
      <a
        href="/api/auth/qb"
        target="_top"
        className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
      >
        Connect QuickBooks Account
      </a>
    </div>
  );
}
