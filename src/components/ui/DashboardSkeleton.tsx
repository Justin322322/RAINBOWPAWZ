'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface DashboardSkeletonProps {
  type?: 'admin' | 'cremation' | 'furparent';
}

export default function DashboardSkeleton({ type = 'admin' }: DashboardSkeletonProps) {
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

  // Render different skeletons based on the dashboard type
  const renderAdminOrCremationSkeleton = () => (
    <>
      {/* Welcome section */}
      <motion.div
        className="mb-8 bg-white rounded-xl shadow-sm p-6"
        variants={itemAnimation}
      >
        <div className="flex items-center justify-between">
          <div className="w-full">
            <motion.div
              className="h-8 bg-gray-200 rounded-md w-1/3 mb-2"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />
            <motion.div
              className="h-4 bg-gray-200 rounded-md w-2/3"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />
          </div>
          <motion.div
            className="h-10 bg-gray-200 rounded-md w-40"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        variants={itemAnimation}
      >
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="bg-white rounded-xl shadow-sm p-6"
            variants={itemAnimation}
          >
            <div className="flex items-center">
              <motion.div
                className="w-12 h-12 rounded-full bg-gray-200 mr-4"
                variants={pulseAnimation}
                initial="initial"
                animate="animate"
              />
              <div className="w-full">
                <motion.div
                  className="h-4 bg-gray-200 rounded-md w-1/2 mb-2"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />
                <motion.div
                  className="h-6 bg-gray-200 rounded-md w-1/3"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Content area */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={itemAnimation}
      >
        <motion.div
          className="bg-white rounded-xl shadow-sm p-6 h-64"
          variants={itemAnimation}
        >
          <motion.div
            className="h-6 bg-gray-200 rounded-md w-1/3 mb-4"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
          <motion.div
            className="h-40 bg-gray-200 rounded-md w-full"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
        </motion.div>

        <motion.div
          className="bg-white rounded-xl shadow-sm p-6 h-64"
          variants={itemAnimation}
        >
          <motion.div
            className="h-6 bg-gray-200 rounded-md w-1/3 mb-4"
            variants={pulseAnimation}
            initial="initial"
            animate="animate"
          />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                className="h-6 bg-gray-200 rounded-md w-full"
                variants={pulseAnimation}
                initial="initial"
                animate="animate"
                style={{ opacity: 0.6 - (i * 0.06) }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </>
  );

  // Fur parent dashboard skeleton
  const renderFurParentSkeleton = () => (
    <>
      {/* Hero section */}
      <motion.div
        className="mb-8 bg-white rounded-xl shadow-sm overflow-hidden"
        variants={itemAnimation}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
          {/* Left side - Images grid */}
          <motion.div
            variants={itemAnimation}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <motion.div
                className="aspect-square bg-gray-200 rounded-lg"
                variants={pulseAnimation}
                initial="initial"
                animate="animate"
              />
              <motion.div
                className="aspect-square bg-gray-200 rounded-lg"
                variants={pulseAnimation}
                initial="initial"
                animate="animate"
              />
            </div>
            <motion.div
              className="aspect-video bg-gray-200 rounded-lg"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />
          </motion.div>

          {/* Right side - Content */}
          <motion.div
            variants={itemAnimation}
            className="flex flex-col justify-center"
          >
            <motion.div
              className="h-5 bg-gray-200 rounded-md w-1/3 mb-3"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />
            <motion.div
              className="h-8 bg-gray-200 rounded-md w-3/4 mb-4"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />
            <div className="space-y-2 mb-6">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="h-4 bg-gray-200 rounded-md w-full"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                  style={{ width: `${100 - (i * 5)}%` }}
                />
              ))}
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center">
                  <motion.div
                    className="w-6 h-6 rounded-full bg-gray-200 mr-3"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                  <motion.div
                    className="h-4 bg-gray-200 rounded-md w-1/2"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Services section */}
      <motion.div
        className="mb-8"
        variants={itemAnimation}
      >
        <motion.div
          className="h-7 bg-gray-200 rounded-md w-1/4 mb-4"
          variants={pulseAnimation}
          initial="initial"
          animate="animate"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
              variants={itemAnimation}
            >
              <motion.div
                className="h-12 bg-gray-200"
                variants={pulseAnimation}
                initial="initial"
                animate="animate"
              />
              <div className="p-4">
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
                  className="h-4 bg-gray-200 rounded-md w-1/3 mb-4"
                  variants={pulseAnimation}
                  initial="initial"
                  animate="animate"
                />
                <div className="flex space-x-2">
                  <motion.div
                    className="h-8 bg-gray-200 rounded-md flex-1"
                    variants={pulseAnimation}
                    initial="initial"
                    animate="animate"
                  />
                  <motion.div
                    className="h-8 bg-gray-200 rounded-md flex-1"
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
    </>
  );

  return (
    <motion.div
      className="w-full"
      initial="hidden"
      animate="show"
      variants={containerAnimation}
    >
      {type === 'furparent' ? renderFurParentSkeleton() : renderAdminOrCremationSkeleton()}
    </motion.div>
  );
}
