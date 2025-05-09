import type { Metadata } from "next";
import { Inter, Crimson_Text } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const crimsonText = Crimson_Text({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "RainbowPaws - Pet Memorial Services",
  description: "Providing dignified and compassionate memorial services for your beloved companions with grace and respect.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={crimsonText.className}>
      <body>{children}</body>
    </html>
  );
}
