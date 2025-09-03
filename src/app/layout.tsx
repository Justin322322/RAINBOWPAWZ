import './globals.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import ClientToastProvider from "@/components/providers/ClientToastProvider";
import ToastWrapper from "@/components/providers/ToastWrapper";
import NotificationProvider from "@/components/providers/NotificationProvider";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { AuthStateProvider } from "@/contexts/AuthStateContext";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

// Fonts
const inter = Inter({
  subsets: ['latin'],
  weight: ['300','400','500','600','700'],
  display: 'swap',
  variable: '--font-inter',
});
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400','500','600','700'],
  display: 'swap',
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  title: 'RainbowPaws - Pet Memorial Services',
  description: 'Providing dignified and compassionate memorial services for your beloved companions with grace and respect.',
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }],
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="shortcut icon" href="/logo.png" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />

        {/* CONTENT-AWARE, ROUTE-AWARE CHATBOT */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  const toLower = s => (s||'').toLowerCase();
  const link = (href, text) => '<a href="'+href+'" style="color:#2F7B5F;font-weight:bold;">'+text+'</a>';
  async function fetchJSON(url, opts={}) {
    try {
      const res = await fetch(url, { credentials:'include', ...opts });
      if (!res.ok) throw new Error('HTTP '+res.status);
      return await res.json();
    } catch (e) { console.error('fetchJSON',e); return null; }
  }
  const NLP = {
    detectIntent(q){
      const s = toLower(q);
      if (/book/.test(s) && /where/.test(s)) return 'where_to_book';
      if (/my bookings|show my bookings/.test(s)) return 'view_bookings';
      return null;
    }
  };
  const routes = {
    services: '/user/furparent_dashboard/services',
    bookings: '/user/furparent_dashboard/bookings',
  };
  function guard(roleNeeded, user){
    if (!user) return 'Please ' + link('/login','log in') + ' first.';
    if (user.role !== roleNeeded) return 'This is available only for '+roleNeeded;
    return null;
  }
  async function router(q){
    const user = (() => { try { return JSON.parse(localStorage.getItem('user_data')); } catch{return null;} })();
    const intent = NLP.detectIntent(q);
    if (intent === 'where_to_book') {
      const g = guard('furparent', user);
      if (g) return g;
      return \`You can book cremation services here: \${link(routes.services, routes.services)}<br>Steps:<br>1. Go to the Services page.<br>2. Choose a provider.<br>3. Select package.<br>4. Confirm booking.\`;
    }
    if (intent === 'view_bookings') {
      const g = guard('furparent', user);
      if (g) return g;
      return 'View your bookings here: ' + link(routes.bookings, routes.bookings);
    }
    return null;
  }
  window.noupeConfig = {
    theme:'light', position:'bottom-right', primaryColor:'#2F7B5F',
    greeting:'Hi! How can I help you with pet memorial services?',
    placeholder:'Ask me about booking or your account...',
    responseHandlers:{
      onServiceQuery: q => router(q),
      onBookingQuery: q => router(q),
      onGeneralQuery: q => router(q),
    },
    init(){ console.log('RainbowPaws AI Assistant initialized'); }
  };
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', () => window.noupeConfig.init())
    : window.noupeConfig.init();
})();`,
          }}
        />
        <script src="https://www.noupe.com/embed/01990cf6b883709ba7534e4584d6c97d6c71.js"></script>
      </head>
      <body className={inter.className}>
        <AuthStateProvider>
          <ClientToastProvider>
            <NotificationProvider>
              <LoadingProvider>
                {children}
                <LoadingOverlay />
              </LoadingProvider>
            </NotificationProvider>
          </ClientToastProvider>
          <ToastWrapper />
        </AuthStateProvider>
      </body>
    </html>
  );
}
