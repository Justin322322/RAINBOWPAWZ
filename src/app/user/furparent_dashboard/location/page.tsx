'use client';

import { motion } from 'framer-motion';
import FurParentNavbar from '@/components/navigation/FurParentNavbar';

export default function LocationPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <FurParentNavbar activePage="location" />

      {/* Main Content */}
      <main>
        {/* Hero Section with Pattern Background */}
        <div className="relative py-16 bg-[var(--primary-green)]">
          <div className="absolute inset-0 bg-[url('/bg_4.png')] bg-repeat opacity-50"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-bold text-white text-center mb-4"
            >
              Our Locations
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-white text-center max-w-3xl mx-auto"
            >
              Find RainbowPaws service providers near you
            </motion.p>
          </div>
        </div>

        {/* Location Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-serif text-[var(--primary-green)] mb-6">
              Our Service Locations
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              RainbowPaws is proud to offer our services in various locations across the Philippines. 
              Our network of trusted service providers ensures that you can find compassionate pet memorial 
              services no matter where you are located.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-serif text-[var(--primary-green)] mb-3">Luzon</h3>
                <ul className="space-y-2 text-[var(--text-secondary)]">
                  <li>• Metro Manila</li>
                  <li>• Cavite</li>
                  <li>• Laguna</li>
                  <li>• Batangas</li>
                  <li>• Rizal</li>
                  <li>• Quezon</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-serif text-[var(--primary-green)] mb-3">Visayas</h3>
                <ul className="space-y-2 text-[var(--text-secondary)]">
                  <li>• Cebu</li>
                  <li>• Bohol</li>
                  <li>• Negros Occidental</li>
                  <li>• Iloilo</li>
                  <li>• Leyte</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-serif text-[var(--primary-green)] mb-3">Mindanao</h3>
                <ul className="space-y-2 text-[var(--text-secondary)]">
                  <li>• Davao</li>
                  <li>• Cagayan de Oro</li>
                  <li>• General Santos</li>
                  <li>• Zamboanga</li>
                  <li>• Butuan</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-serif text-[var(--primary-green)] mb-6">
              Contact Us
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              If you don't see your location listed or have questions about service availability in your area, 
              please don't hesitate to contact our support team. We're continuously expanding our network to 
              better serve pet owners across the Philippines.
            </p>
            
            <div className="flex flex-col md:flex-row gap-8 mt-8">
              <div className="flex-1 bg-gray-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-serif text-[var(--primary-green)] mb-3">Customer Support</h3>
                <p className="text-[var(--text-secondary)] mb-2">Email: support@rainbowpaws.com</p>
                <p className="text-[var(--text-secondary)] mb-2">Phone: (02) 8123-4567</p>
                <p className="text-[var(--text-secondary)]">Hours: Monday to Friday, 9:00 AM - 5:00 PM</p>
              </div>
              
              <div className="flex-1 bg-gray-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-serif text-[var(--primary-green)] mb-3">Become a Service Provider</h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  Are you a pet memorial service provider interested in joining our network? 
                  We'd love to hear from you!
                </p>
                <button className="bg-[var(--primary-green)] text-white px-6 py-2 rounded-md hover:bg-[var(--primary-green-hover)] transition-colors duration-300">
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
