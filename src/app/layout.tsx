import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import ClientToastProvider from "@/components/providers/ClientToastProvider";
import ToastWrapper from "@/components/providers/ToastWrapper";
import NotificationProvider from "@/components/providers/NotificationProvider";

// Load Inter font for sans-serif text
const inter = Inter({
  subsets: ["latin"],
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
  title: "RainbowPaws - Pet Memorial Services",
  description: "Providing dignified and compassionate memorial services for your beloved companions with grace and respect.",
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
