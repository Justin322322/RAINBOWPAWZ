import type { Metadata } from "next";
import { Inter, Crimson_Text } from "next/font/google";
import "./globals.css";
import ClientToastProvider from "@/components/providers/ClientToastProvider";
import ToastWrapper from "@/components/providers/ToastWrapper";

const inter = Inter({ subsets: ["latin"] });
const crimsonText = Crimson_Text({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
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
    <html lang="en" className={crimsonText.className}>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="shortcut icon" href="/logo.png" />
      </head>
      <body>
        <ClientToastProvider>
          {children}
        </ClientToastProvider>
        <ToastWrapper />
      </body>
    </html>
  );
}
