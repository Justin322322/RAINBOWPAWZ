'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import FurParentDashboardWrapper from '@/components/navigation/FurParentDashboardWrapper';
import { UserData } from '@/components/withAuth';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface FurParentDashboardProps {
  userData?: UserData;
}

function FurParentDashboard({ userData }: FurParentDashboardProps) {
  return (
    <>
      {/* Review Notification Banner */}
      <FurParentDashboardWrapper userData={userData}>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left Side - Images */}
          <motion.div
            className="grid grid-cols-1 gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-square overflow-hidden rounded-lg shadow-md">
                <Image
                  src="/image_1.png"
                  alt="Pet Memorial Services"
                  width={400}
                  height={400}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="aspect-square overflow-hidden rounded-lg shadow-md">
                <Image
                  src="/image_2.png"
                  alt="Pet Memorial Services"
                  width={400}
                  height={400}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
            <div className="aspect-[2/1] overflow-hidden rounded-lg shadow-md">
              <Image
                src="/image_3.png"
                alt="Pet Memorial Services"
                width={800}
                height={400}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          </motion.div>

          {/* Right Side - Content */}
          <motion.div
            className="flex flex-col space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div>
              <h2 className="text-[var(--primary-green)] modern-label text-lg mb-2">Who we are</h2>
              <h1 className="text-4xl modern-heading text-[var(--text-primary)] mb-6">About RainbowPaws</h1>
              <p className="text-[var(--text-secondary)] modern-text mb-6">
                Losing a beloved pet is never easy, and we understand the deep bond between you and your furry companion.
                That&apos;s why we created RainbowPaws, an online platform designed to support pet owners during their time of loss.
                This connects clients with trusted service providers, ensuring a seamless and compassionate experience while honoring the memory of their beloved pets.
              </p>
              <p className="text-[var(--text-secondary)] modern-text mb-6">
                Every day, we strive to improve our system to provide a dignified and transparent farewell for your cherished pets.
                With RainbowPaws, you can confidently choose a trusted cremation service, ensuring peace of mind and respect for your pet&apos;s final journey.
              </p>

              {/* Service Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6">
                    <Image
                      src="/check-icon.svg"
                      alt="Check"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                  </div>
                  <span className="text-[var(--text-secondary)] modern-text">Personalized Memorial Services</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6">
                    <Image
                      src="/check-icon.svg"
                      alt="Check"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                  </div>
                  <span className="text-[var(--text-secondary)] modern-text">Verified and Licensed Providers</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6">
                    <Image
                      src="/check-icon.svg"
                      alt="Check"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                  </div>
                  <span className="text-[var(--text-secondary)] modern-text">Memorial Keepsakes & Tributes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6">
                    <Image
                      src="/check-icon.svg"
                      alt="Check"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                  </div>
                  <span className="text-[var(--text-secondary)] modern-text">User Reviews & Ratings</span>
                </div>
              </div>

              <div className="mt-8">
                <Link href="/user/furparent_dashboard/services" passHref>
                  <Button variant="primary" size="lg">
                    View Services
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>


      </main>
      </FurParentDashboardWrapper>
    </>
  );
}

// Export the component directly (OTP verification is now handled by layout)
export default FurParentDashboard;
