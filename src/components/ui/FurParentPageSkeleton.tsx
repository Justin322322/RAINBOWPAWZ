'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface FurParentPageSkeletonProps {
  type?: 'services' | 'bookings' | 'cart' | 'checkout' | 'profile' | 'package';
}

export default function FurParentPageSkeleton({ type = 'services' }: FurParentPageSkeletonProps) {
  // Optimized animation for skeleton pulse effect - reduced CPU usage
  const pulseAnimation = {
    initial: { opacity: 0.7 },
    animate: {
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 2,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.5 // Add delay between repeats to reduce CPU usage
      }
    }
  };

  // Simplified entrance animation for skeleton items
  const containerAnimation = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.05 // Reduced stagger for better performance
      }
    }
  };

  const itemAnimation = {
    hidden: { opacity: 0, y: 10 }, // Reduced transform distance
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.2 // Faster individual animations
      }
    }
  };

  // Render different skeletons based on the page type
  const renderSkeleton = () => {
    switch (type) {
      case 'services':
        return renderServicesPageSkeleton();
      case 'bookings':
        return renderBookingsPageSkeleton();
      case 'cart':
        return renderCartPageSkeleton();
      case 'checkout':
        return renderCheckoutPageSkeleton();
      case 'profile':
        return renderProfilePageSkeleton();
      case 'package':
        return renderPackagePageSkeleton();
      default:
        return renderServicesPageSkeleton();
    }
  };

  // Skeleton for services page
  const renderServicesPageSkeleton = () => (
    <>
      {/* Hero section with pattern background */}
      <motion.div
        className="relative py-16 bg-gray-200 rounded-xl mb-8"
        variants={itemAnimation}
      >
        <div className="max-w-full mx-auto px-4 relative z-10">
          <motion.div
            className="h-12 bg-gray-300 rounded-md w-3/4 mx-auto mb-4"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
          <motion.div
            className="h-6 bg-gray-300 rounded-md w-2/3 mx-auto"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
        </div>
      </motion.div>

      {/* Map section */}
      <motion.div
        className="bg-white rounded-xl shadow-sm p-8 mb-12 relative z-20"
        variants={itemAnimation}
      >
        <motion.div
          className="h-6 bg-gray-200 rounded-md w-full mx-auto mb-6 text-center"
          variants={pulseAnimation}
          initial="initial"
          animate="animate"
        />

        <div className="flex flex-col gap-4 items-center justify-center">
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              className="h-5 bg-gray-200 rounded-md w-48"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />
          </div>

          {/* Map Container */}
          <motion.div
            className="w-full h-[500px] bg-gray-200 rounded-lg"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
        </div>
      </motion.div>

      {/* Service Providers Grid */}
      <motion.div
        className="mb-8"
        variants={itemAnimation}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200"
              variants={itemAnimation}
            >
              <motion.div
                className="h-14 bg-gray-200"
                variants={pulseAnimation}
                initial="initial"
                animate="animate"
              />
              <div className="p-6">
                <motion.div
                  className="h-6 bg-gray-200 rounded-md w-3/4 mb-2"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />
                <motion.div
                  className="h-4 bg-gray-200 rounded-md w-1/2 mb-2"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />
                <motion.div
                  className="h-4 bg-gray-200 rounded-md w-1/3 mb-6"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />

                <div className="mt-auto flex flex-col space-y-3">
                  <div className="flex justify-between">
                    <motion.div
                      className="h-10 bg-gray-200 rounded-md w-[48%]"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                    <motion.div
                      className="h-10 bg-gray-200 rounded-md w-[48%]"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                  </div>
                  <motion.div
                    className="h-10 bg-gray-200 rounded-md w-full"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Pagination */}
      <motion.div
        className="flex justify-center mt-8"
        variants={itemAnimation}
      >
        <div className="flex items-center space-x-2">
          <motion.div
            className="h-10 w-10 bg-gray-200 rounded-md"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="h-8 w-8 bg-gray-200 rounded-md"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />
          ))}
          <motion.div
            className="h-10 w-10 bg-gray-200 rounded-md"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
        </div>
      </motion.div>
    </>
  );

  // Skeleton for bookings page
  const renderBookingsPageSkeleton = () => (
    <>
      {/* Page header */}
      <motion.div
        className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between"
        variants={itemAnimation}
      >
        <div>
          <motion.div
            className="h-10 bg-gray-200 rounded-md w-48 mb-2"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
          <motion.div
            className="h-5 bg-gray-200 rounded-md w-64"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
        </div>
        <motion.div
          className="h-10 bg-gray-200 rounded-md w-40 mt-4 md:mt-0"
          variants={pulseAnimation}
          initial="initial"
          animate="animate"
        />
      </motion.div>

      {/* Filter buttons */}
      <motion.div
        className="mb-8 flex flex-wrap gap-2"
        variants={itemAnimation}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="h-10 bg-gray-200 rounded-md w-24"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
        ))}
      </motion.div>

      {/* Booking cards */}
      <motion.div
        className="space-y-6"
        variants={itemAnimation}
      >
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-6"
            variants={itemAnimation}
          >
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <div className="mb-4 md:mb-0">
                <div className="flex items-center">
                  <motion.div
                    className="h-7 bg-gray-200 rounded-md w-48 mb-2 mr-3"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                  <motion.div
                    className="h-6 w-20 bg-gray-200 rounded-full"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                </div>
                <motion.div
                  className="h-5 bg-gray-200 rounded-md w-32"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />
              </div>
              <div>
                <motion.div
                  className="h-7 bg-gray-200 rounded-md w-24 mb-2"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />
                <motion.div
                  className="h-5 bg-gray-200 rounded-md w-36"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />
              </div>
            </div>

            <motion.div
              className="mt-6 border-t border-gray-100 pt-4"
              variants={itemAnimation}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <motion.div
                    className="h-4 bg-gray-200 rounded-md w-32 mb-1"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                  <motion.div
                    className="h-5 bg-gray-200 rounded-md w-48"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                </div>
                <div>
                  <motion.div
                    className="h-4 bg-gray-200 rounded-md w-32 mb-1"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                  <motion.div
                    className="h-5 bg-gray-200 rounded-md w-full"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>
    </>
  );

  // Skeleton for cart page
  const renderCartPageSkeleton = () => (
    <>
      {/* Back button */}
      <motion.div
        className="mb-4"
        variants={itemAnimation}
      >
        <motion.div
          className="h-8 bg-gray-200 rounded-md w-24"
          variants={pulseAnimation}
          initial="initial"
          animate="animate"
        />
      </motion.div>

      {/* Page header */}
      <motion.div
        className="flex items-center justify-between mb-8"
        variants={itemAnimation}
      >
        <div className="flex items-center">
          <motion.div
            className="h-8 w-8 bg-gray-200 rounded-md mr-3"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
          <motion.div
            className="h-10 bg-gray-200 rounded-md w-32"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
        </div>
        <motion.div
          className="h-6 bg-gray-200 rounded-md w-24"
          variants={pulseAnimation}
          initial="initial"
          animate="animate"
        />
      </motion.div>

      {/* Cart items */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        variants={itemAnimation}
      >
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            className="bg-white rounded-lg shadow-md overflow-hidden"
            variants={itemAnimation}
          >
            <motion.div
              className="bg-gray-200 p-6 h-14"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />

            <ul className="divide-y divide-gray-200">
              {[1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="p-6 hover:bg-gray-50 transition-colors"
                  variants={itemAnimation}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="mb-4 md:mb-0">
                      <motion.div
                        className="h-6 bg-gray-200 rounded-md w-48 mb-2"
                        variants={pulseAnimation}
                        initial="initial"
                        animate="animate"
                      />
                      <motion.div
                        className="h-4 bg-gray-200 rounded-md w-36 mb-2"
                        variants={pulseAnimation}
                        initial="initial"
                        animate="animate"
                      />
                      <motion.div
                        className="h-4 bg-gray-200 rounded-md w-64 mb-3"
                        variants={pulseAnimation}
                        initial="initial"
                        animate="animate"
                      />

                      <div className="flex items-center">
                        <motion.div
                          className="h-4 w-4 bg-gray-200 rounded-md mr-1"
                          variants={pulseAnimation}
                          initial="initial"
                          animate="animate"
                        />
                        <motion.div
                          className="h-4 bg-gray-200 rounded-md w-24 mr-2"
                          variants={pulseAnimation}
                          initial="initial"
                          animate="animate"
                        />
                        <motion.div
                          className="h-4 w-4 bg-gray-200 rounded-md mr-1"
                          variants={pulseAnimation}
                          initial="initial"
                          animate="animate"
                        />
                        <motion.div
                          className="h-4 bg-gray-200 rounded-md w-16"
                          variants={pulseAnimation}
                          initial="initial"
                          animate="animate"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <motion.div
                        className="h-6 bg-gray-200 rounded-md w-24 mb-3"
                        variants={pulseAnimation}
                        initial="initial"
                        animate="animate"
                      />

                      <div className="flex space-x-2">
                        <motion.div
                          className="h-8 bg-gray-200 rounded-md w-24"
                          variants={pulseAnimation}
                          initial="initial"
                          animate="animate"
                        />
                        <motion.div
                          className="h-8 bg-gray-200 rounded-md w-24"
                          variants={pulseAnimation}
                          initial="initial"
                          animate="animate"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Order Summary */}
        <motion.div
          className="lg:col-span-1"
          variants={itemAnimation}
        >
          <motion.div
            className="bg-white rounded-lg shadow-md overflow-hidden sticky top-8"
            variants={itemAnimation}
          >
            <motion.div
              className="bg-gray-200 p-6 h-14"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />

            <div className="p-6">
              <div className="space-y-4 mb-6">
                {[1, 2].map((i) => (
                  <div key={i} className="flex justify-between">
                    <motion.div
                      className="h-5 bg-gray-200 rounded-md w-32"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                    <motion.div
                      className="h-5 bg-gray-200 rounded-md w-20"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                  </div>
                ))}

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between">
                    <motion.div
                      className="h-5 bg-gray-200 rounded-md w-20"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                    <motion.div
                      className="h-5 bg-gray-200 rounded-md w-24"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <motion.div
                    className="h-6 bg-gray-200 rounded-md w-16"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                  <motion.div
                    className="h-6 bg-gray-200 rounded-md w-28"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                </div>
              </div>

              <motion.div
                className="bg-gray-100 p-4 rounded-md mb-6 h-16"
                variants={pulseAnimation}
                initial="initial"
                animate="animate"
              />

              <motion.div
                className="h-12 bg-gray-200 rounded-md w-full"
                variants={pulseAnimation}
                initial="initial"
                animate="animate"
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );

  // Skeleton for checkout page
  const renderCheckoutPageSkeleton = () => (
    <>
      {/* Back button */}
      <motion.div
        className="mb-8"
        variants={itemAnimation}
      >
        <motion.div
          className="h-8 bg-gray-200 rounded-md w-32 flex items-center"
          variants={pulseAnimation}
          initial="initial"
          animate="animate"
        />
      </motion.div>

      {/* Page header */}
      <motion.div
        className="mb-8"
        variants={itemAnimation}
      >
        <motion.div
          className="h-10 bg-gray-200 rounded-md w-1/4"
          variants={pulseAnimation}
          initial="initial"
          animate="animate"
        />
      </motion.div>

      {/* Checkout form and summary */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        variants={itemAnimation}
      >
        <div className="lg:col-span-2">
          <motion.div
            className="bg-white rounded-lg shadow-md overflow-hidden mb-8"
            variants={itemAnimation}
          >
            <motion.div
              className="bg-gray-200 p-6 h-14"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />

            <div className="p-6 space-y-6">
              <div>
                <motion.div
                  className="h-5 bg-gray-200 rounded-md w-48 mb-2"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />
                <motion.div
                  className="h-12 bg-gray-200 rounded-md w-full"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <motion.div
                    className="h-5 bg-gray-200 rounded-md w-36 mb-2"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                  <div className="relative">
                    <motion.div
                      className="h-12 bg-gray-200 rounded-md w-full"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                  </div>
                </div>

                <div>
                  <motion.div
                    className="h-5 bg-gray-200 rounded-md w-36 mb-2"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                  <div className="relative">
                    <motion.div
                      className="h-12 bg-gray-200 rounded-md w-full"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                  </div>
                </div>
              </div>

              <div>
                <motion.div
                  className="h-5 bg-gray-200 rounded-md w-48 mb-2"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />
                <motion.div
                  className="h-24 bg-gray-200 rounded-md w-full"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-lg shadow-md overflow-hidden"
            variants={itemAnimation}
          >
            <div className="p-6">
              <motion.div
                className="h-6 bg-gray-200 rounded-md w-48 mb-4"
                variants={pulseAnimation}
                initial="initial"
                animate="animate"
              />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="flex items-center p-4 border rounded-md"
                    variants={itemAnimation}
                  >
                    <motion.div
                      className="h-4 w-4 bg-gray-200 rounded-full mr-3"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                    <motion.div
                      className="h-6 w-6 bg-gray-200 rounded-md mr-2"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                    <motion.div
                      className="h-5 bg-gray-200 rounded-md w-32"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="h-12 bg-gray-200 rounded-md w-full mt-8"
                variants={pulseAnimation}
                initial="initial"
                animate="animate"
              />
            </div>
          </motion.div>
        </div>

        {/* Order summary */}
        <motion.div
          className="lg:col-span-1"
          variants={itemAnimation}
        >
          <motion.div
            className="bg-white rounded-lg shadow-md overflow-hidden sticky top-8"
            variants={itemAnimation}
          >
            <motion.div
              className="bg-gray-200 p-6 h-14"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />

            <div className="p-6">
              <div className="mb-6">
                <motion.div
                  className="h-6 bg-gray-200 rounded-md w-48 mb-2"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />
                <motion.div
                  className="h-4 bg-gray-200 rounded-md w-36"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />
              </div>

              <div className="border-t border-b border-gray-200 py-4 mb-4">
                <div className="flex justify-between mb-2">
                  <motion.div
                    className="h-6 bg-gray-200 rounded-md w-36"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                </div>
                <motion.div
                  className="h-4 bg-gray-200 rounded-md w-full mb-2"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />
                <div className="flex items-center">
                  <motion.div
                    className="h-4 bg-gray-200 rounded-md w-full"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between">
                    <motion.div
                      className="h-5 bg-gray-200 rounded-md w-32"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                    <motion.div
                      className="h-5 bg-gray-200 rounded-md w-20"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                  </div>
                ))}
              </div>

              <motion.div
                className="bg-gray-100 p-4 rounded-md h-24"
                variants={pulseAnimation}
                initial="initial"
                animate="animate"
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );

  // Skeleton for profile page
  const renderProfilePageSkeleton = () => (
    <>
      {/* Page header */}
      <motion.div
        className="mb-8"
        variants={itemAnimation}
      >
        <motion.div
          className="h-10 bg-gray-200 rounded-md w-1/3 mb-2"
          variants={pulseAnimation}
          initial="initial"
          animate="animate"
        />
        <motion.div
          className="h-5 bg-gray-200 rounded-md w-1/2"
          variants={pulseAnimation}
          initial="initial"
          animate="animate"
        />
      </motion.div>

      {/* Profile form */}
      <motion.div
        className="bg-white rounded-lg shadow-sm p-6 mb-8"
        variants={itemAnimation}
      >
        <motion.div
          className="h-6 bg-gray-200 rounded-md w-1/4 mb-6"
          variants={pulseAnimation}
          initial="initial"
          animate="animate"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <motion.div
                className="h-5 bg-gray-200 rounded-md w-1/3 mb-2"
                variants={pulseAnimation}
                initial="initial"
                animate="animate"
              />
              <motion.div
                className="h-10 bg-gray-200 rounded-md w-full"
                variants={pulseAnimation}
                initial="initial"
                animate="animate"
              />
            </div>
          ))}
        </div>

        <motion.div
          className="h-10 bg-gray-200 rounded-md w-32 ml-auto"
          variants={pulseAnimation}
          initial="initial"
          animate="animate"
        />
      </motion.div>
    </>
  );

  // Skeleton for package detail page
  const renderPackagePageSkeleton = () => (
    <>
      {/* Back button */}
      <motion.div
        className="mb-6"
        variants={itemAnimation}
      >
        <motion.div
          className="h-8 bg-gray-200 rounded-md w-32"
          variants={pulseAnimation}
          initial="initial"
          animate="animate"
        />
      </motion.div>

      {/* Provider banner */}
      <motion.div
        className="bg-gray-200 rounded-lg p-6 mb-8"
        variants={itemAnimation}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <motion.div
              className="h-10 bg-gray-300 rounded-md w-2/3 mb-2"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />
            <motion.div
              className="h-5 bg-gray-300 rounded-md w-1/2 mb-6"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />
            <motion.div
              className="h-6 bg-gray-300 rounded-md w-1/3 mb-2"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />
            <motion.div
              className="h-24 bg-gray-300 rounded-md w-full"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />
          </div>
          <motion.div
            className="h-64 bg-gray-300 rounded-lg"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
        </div>
      </motion.div>

      {/* Package carousel */}
      <motion.div
        className="bg-white rounded-xl shadow-sm p-6 mb-8"
        variants={itemAnimation}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <motion.div
            className="h-10 bg-gray-200 rounded-md w-48 mb-4 md:mb-0"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
          <div className="flex items-center">
            <motion.div
              className="h-6 bg-gray-200 rounded-md w-16 mr-2"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />
            <motion.div
              className="h-10 bg-gray-200 rounded-md w-40"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />
          </div>
        </div>

        <div className="h-px w-full bg-gray-200 mb-8"></div>

        <div className="relative">
          <div className="flex items-center justify-between">
            <motion.div
              className="h-10 w-10 bg-gray-200 rounded-full"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mx-4">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
                  variants={itemAnimation}
                >
                  <motion.div
                    className="h-40 bg-gray-200"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                  <div className="p-4 text-center">
                    <motion.div
                      className="h-6 bg-gray-200 rounded-md w-3/4 mx-auto mb-2"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                    <motion.div
                      className="h-5 bg-gray-200 rounded-md w-1/2 mx-auto mb-3"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                    <motion.div
                      className="h-10 bg-gray-200 rounded-md w-full"
                      variants={pulseAnimation}
                      initial="initial"
                      animate="animate"
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="h-10 w-10 bg-gray-200 rounded-full"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />
          </div>

          {/* Pagination dots */}
          <div className="flex justify-center space-x-2 mt-4">
            {[1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-2 w-2 rounded-full bg-gray-200"
                variants={pulseAnimation}
                initial="initial"
                animate="animate"
                style={{ opacity: i === 1 ? 1 : 0.5 }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );

  return (
    <motion.div
      className="w-full"
      initial="hidden"
      animate="show"
      variants={containerAnimation}
    >
      {renderSkeleton()}
    </motion.div>
  );
}
