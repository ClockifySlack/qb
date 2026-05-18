import './globals.css';

export const metadata = {
  title: 'QuickBooks Payroll Bridge | CAKE.com Marketplace',
  description: 'Automatically sync tracked hours and invoices from Clockify directly to QuickBooks.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 antialiased">{children}</body>
    </html>
  )
}
