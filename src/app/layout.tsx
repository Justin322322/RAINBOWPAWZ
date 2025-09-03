import './globals.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import ClientToastProvider from "@/components/providers/ClientToastProvider";
import ToastWrapper from "@/components/providers/ToastWrapper";
import NotificationProvider from "@/components/providers/NotificationProvider";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { AuthStateProvider } from "@/contexts/AuthStateContext";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize chatbot with dynamic context awareness
              window.noupeConfig = {
                theme: 'light',
                position: 'bottom-right',
                primaryColor: '#2F7B5F',
                greeting: 'Hi! How can I help you with pet memorial services today?',
                placeholder: 'Ask me about our services...',

                // Dynamic context functions
                contextLoader: {
                  // Function to get current page context
                  getCurrentPage: function() {
                    const path = window.location.pathname;
                    if (path.includes('/services')) return 'services';
                    if (path.includes('/cremation')) return 'cremation';
                    if (path.includes('/admin')) return 'admin';
                    return 'homepage';
                  },

                  // Function to get available services
                  getAvailableServices: async function() {
                    try {
                      const response = await fetch('/api/service-providers?limit=10');
                      const data = await response.json();
                      return data.providers || [];
                    } catch (error) {
                      console.log('Could not fetch services:', error);
                      return [];
                    }
                  },

                  // Function to get user context
                  getUserContext: function() {
                    const userData = localStorage.getItem('user_data');
                    if (userData) {
                      try {
                        return JSON.parse(userData);
                      } catch (e) {
                        return null;
                      }
                    }
                    return null;
                  },

                  // Function to get current filters/search
                  getCurrentFilters: function() {
                    const urlParams = new URLSearchParams(window.location.search);
                    return {
                      location: urlParams.get('location'),
                      search: urlParams.get('search'),
                      maxDistance: urlParams.get('maxDistance')
                    };
                  }
                },

                // Dynamic response handlers
                responseHandlers: {
                  // Handle service-related questions
                  onServiceQuery: async function(query) {
                    const services = await this.contextLoader.getAvailableServices();
                    const userContext = this.contextLoader.getUserContext();
                    const filters = this.contextLoader.getCurrentFilters();

                    // Provide contextual responses based on available data
                    if (query.toLowerCase().includes('near me') || query.toLowerCase().includes('location')) {
                      if (userContext && userContext.address) {
                        return 'I can help you find cremation services near ' + userContext.address + '. There are currently ' + services.length + ' verified providers in your area.';
                      } else {
                        return "I'd be happy to help you find cremation services! Could you please update your address in your profile so I can show you nearby providers?";
                      }
                    }

                    if (query.toLowerCase().includes('price') || query.toLowerCase().includes('cost')) {
                      return "Service prices vary by provider and package type. The most common packages range from ₱3,500 for basic communal services to ₱6,000 for premium private ceremonies. I can help you find specific pricing in your area.";
                    }

                    if (query.toLowerCase().includes('book') || query.toLowerCase().includes('schedule')) {
                      return "To book a service, simply find a provider on our map, select a package that fits your needs, choose your preferred date and time, and complete the booking process. All payments are securely processed.";
                    }

                    // Default service response
                    return 'Based on our current data, we have ' + services.length + ' verified cremation service providers available. Each provider offers different packages and pricing. Would you like me to help you find services in a specific area?';
                  },

                  // Handle booking-related questions
                  onBookingQuery: function(query) {
                    const userContext = this.contextLoader.getUserContext();

                    if (userContext && userContext.user_id) {
                      return "You can view and manage your bookings through your dashboard. Would you like me to guide you to your booking history or help you create a new booking?";
                    } else {
                      return "To book cremation services, you'll need to create a personal account first. Would you like me to guide you through the signup process?";
                    }
                  },

                  // Handle provider-related questions
                  onProviderQuery: function(query) {
                    const userContext = this.contextLoader.getUserContext();

                    if (query.toLowerCase().includes('become') || query.toLowerCase().includes('join')) {
                      return "To become a service provider on RainbowPaws, you'll need to create a business account and submit verification documents including business permits, licenses, and facility certifications. Would you like me to guide you through the process?";
                    }

                    return "All service providers on our platform are thoroughly verified with proper licensing and insurance. Each provider has their own packages, pricing, and service offerings. I can help you find providers that match your specific needs.";
                  },

                  // Handle general questions
                  onGeneralQuery: function(query) {
                    const currentPage = this.contextLoader.getCurrentPage();

                    if (currentPage === 'services') {
                      return "You're currently on our services page. Here you can find cremation service providers, filter by location and service type, and book appointments. Is there something specific you'd like help with?";
                    }

                    if (currentPage === 'cremation') {
                      return "You're in the cremation provider dashboard. Here you can manage your packages, view bookings, and handle your business operations. How can I assist you today?";
                    }

                    return "RainbowPaws provides dignified and compassionate pet memorial services across the Philippines. We connect pet owners with verified cremation service providers. How can I help you today?";
                  }
                },

                // Initialize dynamic behavior
                init: function() {
                  console.log('RainbowPaws AI Assistant initialized');

                  // Listen for page changes
                  window.addEventListener('popstate', () => {
                    console.log('Page changed, updating context');
                  });

                  // Monitor for user login/logout
                  window.addEventListener('storage', (e) => {
                    if (e.key === 'user_data') {
                      console.log('User context updated');
                    }
                  });
                }
              };

              // Auto-initialize when DOM is ready
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => window.noupeConfig.init());
              } else {
                window.noupeConfig.init();
              }
            `
          }}
        />
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
