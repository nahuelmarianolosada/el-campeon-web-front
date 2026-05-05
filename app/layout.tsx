import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { CartProvider } from '@/lib/cart-context'
import './globals.css'

const geist = Geist({ 
  subsets: ["latin"],
  variable: "--font-geist"
})
const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: "--font-geist-mono"
})

export const metadata: Metadata = {
  title: 'El Campeón - Librería y Juguetería',
  description: 'Tu librería y juguetería de confianza en Argentina. Libros, juguetes y más para toda la familia.',
  generator: 'v0.app',
  icons: {
    icon: '/images/el-campeon-logo.png',
    apple: '/images/el-campeon-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geist.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
