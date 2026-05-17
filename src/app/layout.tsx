export const metadata = {
  title: 'Clockify to QuickBooks',
  description: 'QuickBooks integracija za fakture',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
