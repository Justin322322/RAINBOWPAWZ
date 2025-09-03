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
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

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
    icon: [{ url: '/logo.png', type: 'image/png' }],
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="shortcut icon" href="/logo.png" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />

        {/* CONTENT-AWARE, ROLE-AWARE CHATBOT CONFIG */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  // ---- Small utility helpers ----
  const toLower = (s) => (s || '').toLowerCase();
  const clean = (s) => (s || '').trim();
  const has = (s, kw) => toLower(s).includes(kw);
  const link = (href, text) => '<a href="' + href + '" style="color:#2F7B5F;font-weight:bold;">' + text + '</a>';

  // Centralized safe fetch with credentials
  async function fetchJSON(url, opts = {}) {
    try {
      const res = await fetch(url, { credentials: 'include', ...opts });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      console.error('fetchJSON failed:', url, e);
      return null;
    }
  }

  // --- Lightweight NLP (content-aware intent + entity extraction) ---
  const NLP = {
    extractEntities(query){
      const q = toLower(query);
      const size = /(small|medium|large|xl|extra\s?large)/.exec(q)?.[1] || null;
      const species = /(dog|cat|kitten|puppy|rabbit|bird)/.exec(q)?.[1] || null;
      const locationNearMe = /(near me|nearby|around me|closest|location)/.test(q);
      const when = /(today|tomorrow|next week|next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)|on \w+ \d{1,2}|on \d{4}-\d{2}-\d{2})/.exec(q)?.[0] || null;
      const cancel = /(cancel|reschedule)/.test(q);
      const price = /(price|cost|how much|rate)/.test(q);
      const book = /(book|schedule|reserve|appointment)/.test(q);
      const availability = /(available|availability|slots|openings)/.test(q);
      const reviews = /(reviews?|ratings?)/.test(q);
      const provider = /(provider|partner|business|cremation center)/.test(q);
      const admin = /(admin|analytics|platform|system|diagnostic)/.test(q);
      const help = /(help|support|assist)/.test(q);
      return { size, species, locationNearMe, when, cancel, price, book, availability, reviews, provider, admin, help };
    },
    detectIntent(query){
      const q = toLower(query);
      const e = this.extractEntities(q);
      if (e.admin && /(overview|stats|metrics|users|providers|payouts)/.test(q)) return 'admin_overview';
      if (e.provider && /(apply|become|join|requirements|verify)/.test(q)) return 'provider_apply';
      if (e.provider && /(dashboard|bookings|packages|payouts|manage)/.test(q)) return 'provider_manage';
      if ((/my |next |upcoming /.test(q) || /(when|what time)/.test(q)) && /(booking|appointment)/.test(q)) return 'booking_next';
      if (/(status)/.test(q) && /(booking|appointment|refund)/.test(q)) return 'booking_status';
      if (e.cancel && /(booking|appointment)/.test(q)) return 'booking_cancel_intent';
      if (e.price) return 'service_price';
      if (e.book) return 'service_book';
      if (e.availability || e.locationNearMe) return 'service_availability';
      if (e.reviews) return 'service_reviews';
      return 'general_info';
    }
  };

  // --- Context loaders ---
  const contextLoader = {
    getCurrentPage(){
      const p = window.location.pathname;
      if (p.includes('/admin')) return 'admin';
      if (p.includes('/cremation')) return 'provider';
      if (p.includes('/services')) return 'services';
      if (p.includes('/user')) return 'user';
      return 'homepage';
    },
    getUserContext(){
      try {
        const raw = localStorage.getItem('user_data');
        return raw ? JSON.parse(raw) : null; // expected: { user_id, role, address, provider_id? }
      } catch { return null; }
    },
    async getServices(params = {}){
      const qs = new URLSearchParams({ limit: '20', ...params }).toString();
      const data = await fetchJSON('/api/service-providers?' + qs);
      return data?.providers || [];
    },
    async getBookingsForUser(userId){
      const data = await fetchJSON('/api/bookings?userId=' + encodeURIComponent(userId));
      return data?.bookings || [];
    },
    async getProviderDashboard(providerId){
      const data = await fetchJSON('/api/providers/' + encodeURIComponent(providerId) + '/dashboard');
      return data || {};
    },
    async getAdminOverview(){
      const data = await fetchJSON('/api/admin/overview');
      return data || {};
    }
  };

  // --- Role guard & safe replies ---
  function guard(roleNeeded, user){
    if (!user) return 'Please ' + link('/login','log in') + ' to continue.';
    if (Array.isArray(roleNeeded)) {
      if (!roleNeeded.includes(user.role)) return 'This action is not available for your account type.';
    } else if (roleNeeded && user.role !== roleNeeded) {
      return 'This action is not available for your account type.';
    }
    return null;
  }

  // --- Format helpers ---
  const fmt = {
    peso(n){ return typeof n === 'number' ? '₱' + n.toLocaleString('en-PH') : '—'; },
    pkg(pkg){ return pkg ? (pkg.name + (pkg.price ? ' — ' + fmt.peso(pkg.price) : '')) : ''; }
  };

  // --- Router using intents (content-aware) ---
  async function router(query){
    const user = contextLoader.getUserContext();
    const intent = NLP.detectIntent(query);
    const ents = NLP.extractEntities(query);

    switch (intent) {
      case 'service_price': {
        const g = guard('furparent', user);
        if (g) return g;
        const services = await contextLoader.getServices();
        if (!services.length) return 'No providers available right now. Please check back later.';
        // Try to pick a relevant package by species/size keywords
        let bestPkg = null, bestProvider = null;
        for (const prov of services){
          const packages = prov.packages || [];
          for (const p of packages){
            const n = toLower(p.name + ' ' + (p.description||''));
            const sizeOk = ents.size ? n.includes(ents.size) : true;
            const speciesOk = ents.species ? n.includes(ents.species) : true;
            if (sizeOk && speciesOk){ bestPkg = p; bestProvider = prov; break; }
          }
          if (bestPkg) break;
        }
        if (bestPkg){
          return 'Found a matching package: <b>' + bestPkg.name + '</b> from <b>' + (bestProvider?.businessName||'provider') + '</b> — ' + fmt.peso(bestPkg.price) + '. ' + link('/user/furparent_dashboard/services','See all packages');
        }
        return 'Pricing varies by provider and package. ' + link('/user/furparent_dashboard/services','Browse current pricing') + '.';
      }

      case 'service_availability': {
        const g = guard('furparent', user);
        if (g) return g;
        const services = await contextLoader.getServices();
        if (ents.locationNearMe && user?.address) {
          return 'I found ' + services.length + ' verified providers near ' + user.address + '. ' + link('/user/furparent_dashboard/services','Browse services') + '.';
        }
        return 'There are ' + services.length + ' providers with available packages. ' + link('/user/furparent_dashboard/services','Check availability') + '.';
      }

      case 'service_book': {
        const g = guard('furparent', user);
        if (g) return g;
        return 'You can schedule an appointment from the ' + link('/user/furparent_dashboard/services','services page') + '. Payments are processed securely.';
      }

      case 'service_reviews': {
        const g = guard('furparent', user);
        if (g) return g;
        const services = await contextLoader.getServices();
        if (!services.length) return 'No providers found at the moment.';
        const withReviews = services.filter(s => (s.reviewsCount || 0) > 0).slice(0,3);
        if (!withReviews.length) return 'No reviews yet. You can still ' + link('/user/furparent_dashboard/services','browse providers') + ' and view their profiles.';
        const summary = withReviews.map(s => (s.businessName||'Provider') + ' — ' + (s.averageRating ? (s.averageRating.toFixed ? s.averageRating.toFixed(1) : s.averageRating) + '/5' : 'No rating')).join(' | ');
        return 'Top reviewed providers: ' + summary + '. ' + link('/user/furparent_dashboard/services','See more');
      }

      case 'booking_next': {
        const g = guard('furparent', user);
        if (g) return g;
        const bookings = await contextLoader.getBookingsForUser(user.user_id);
        if (!bookings.length) return 'You have no bookings yet. ' + link('/user/furparent_dashboard/services','Book a service');
        const next = bookings.sort((a,b)=> new Date(a.date).getTime()-new Date(b.date).getTime())[0];
        return 'Your next booking is with <b>' + (next.providerName||'provider') + '</b> on <b>' + (next.date||'—') + '</b>. ' + link('/user/furparent_dashboard/bookings','View all bookings');
      }

      case 'booking_status': {
        const g = guard('furparent', user);
        if (g) return g;
        const bookings = await contextLoader.getBookingsForUser(user.user_id);
        if (!bookings.length) return 'No bookings found in your account.';
        const latest = bookings[0];
        return 'Latest booking status: <b>' + (latest.status||'—') + '</b> for <b>' + (latest.providerName||'provider') + '</b>. ' + link('/user/furparent_dashboard/bookings','Open bookings');
      }

      case 'booking_cancel_intent': {
        const g = guard('furparent', user);
        if (g) return g;
        return 'To cancel or reschedule, go to ' + link('/user/furparent_dashboard/bookings','your bookings') + ' and select the booking. Cancellation policies vary by provider.';
      }

      case 'provider_apply': {
        // Available to unauthenticated or any role; will route to signup
        return 'To become a provider, please create a business account and upload required documents. ' + link('/provider/signup','Start provider application') + '.';
      }

      case 'provider_manage': {
        const g = guard('provider', user);
        if (g) return g;
        const dash = await contextLoader.getProviderDashboard(user.provider_id);
        const upcoming = dash?.upcomingBookingsCount ?? '—';
        const unread = dash?.unreadNotifications ?? '—';
        return 'Provider dashboard: ' + upcoming + ' upcoming bookings, ' + unread + ' unread notifications. ' + link('/cremation/dashboard','Open provider dashboard');
      }

      case 'admin_overview': {
        const g = guard('admin', user);
        if (g) return g;
        const o = await contextLoader.getAdminOverview();
        const users = o?.usersTotal ?? '—';
        const providers = o?.providersPending ?? '—';
        const refunds = o?.refundsPending ?? '—';
        return 'Admin overview — Users: ' + users + ', Providers pending: ' + providers + ', Refunds pending: ' + refunds + '. ' + link('/admin','Go to Admin');
      }

      default: {
        const page = contextLoader.getCurrentPage();
        if (page === 'services') return "You're on the services page. You can filter providers by location and package, then book.";
        if (page === 'provider') return "You're in the provider area. Manage bookings, packages, and notifications here.";
        if (page === 'admin') return "Admin area. Manage users, providers, payouts, and diagnostics.";
        return 'RainbowPaws connects pet owners with verified cremation service providers across the Philippines. How can I help you today?';
      }
    }
  }

  // Expose to Noupe widget
  window.noupeConfig = {
    theme: 'light',
    position: 'bottom-right',
    primaryColor: '#2F7B5F',
    greeting: 'Hi! How can I help you with pet memorial services today?',
    placeholder: 'Ask me about our services…',

    // Noupe calls these (we route internally by intent)
    responseHandlers: {
      onServiceQuery: (q) => router(q),
      onBookingQuery: (q) => router(q),
      onProviderQuery: (q) => router(q),
      onGeneralQuery: (q) => router(q),
    },

    // Optional helpers (can be used by the widget)
    contextLoader,

    init(){
      console.log('RainbowPaws content-aware chatbot initialized');
      window.addEventListener('storage', (e) => {
        if (e.key === 'user_data') console.log('User context updated');
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.noupeConfig.init());
  } else {
    window.noupeConfig.init();
  }
})();
            `
          }}
        />

        {/* Noupe embed */}
        <script src='https://www.noupe.com/embed/01990cf6b883709ba7534e4584d6c97d6c71.js'></script>
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
