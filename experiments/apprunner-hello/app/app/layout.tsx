import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'App Runner Hello World',
  description: 'Testing App Runner deployment',
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