import './globals.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import ClientToastProvider from "@/components/providers/ClientToastProvider";
import ToastWrapper from "@/components/providers/ToastWrapper";
import NotificationProvider from "@/components/providers/NotificationProvider";
import Script from 'next/script';

// Load Inter font for sans-serif text
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

// Load Playfair Display for serif headings
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  title: 'RainbowPaws - Pet Memorial Services',
  description: 'Providing dignified and compassionate memorial services for your beloved companions with grace and respect.',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' }
    ],
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="shortcut icon" href="/logo.png" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        
        {/* Force verification on all cremation pages */}
        <Script id="clear-verification-cache" strategy="beforeInteractive">
          {`
            try {
              // Clear any potential verification bypass in session storage
              sessionStorage.removeItem('verified_business');
              
              // Check if we need to redirect to pending verification
              const userData = sessionStorage.getItem('user_data');
              if (userData) {
                try {
                  const data = JSON.parse(userData);
                  const authCookie = document.cookie.split(';').find(c => c.trim().startsWith('auth_token='));
                  if (authCookie) {
                    const [userId, accountType] = decodeURIComponent(authCookie.split('=')[1]).split('_');
                    if (accountType === 'business') {
                      // Force reload verification on all cremation dashboard pages
                      if (window.location.pathname.startsWith('/cremation/') && 
                          !window.location.pathname.includes('/cremation/pending-verification') &&
                          !window.location.pathname.includes('/cremation/documents')) {
                        
                        // We'll keep the user_data but force a new verification check
                        sessionStorage.removeItem('verified_business');
                      }
                    }
                  }
                } catch (e) {
                }
              }
            } catch (e) {
            }
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <ClientToastProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </ClientToastProvider>
        <ToastWrapper />
      </body>
    </html>
  );
}
