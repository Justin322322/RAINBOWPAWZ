'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface DashboardSkeletonProps {
  type?: 'admin' | 'cremation' | 'furparent';
}

export default function DashboardSkeleton({ type = 'admin' }: DashboardSkeletonProps) {
  // Animation for skeleton pulse effect
  const pulseAnimation = {
    initial: { opacity: 0.6 },
    animate: { 
      opacity: 1,
      transition: { 
        repeat: Infinity, 
        repeatType: "reverse" as const, 
        duration: 1.5 
      }
    }
  };

  // Staggered entrance animation for skeleton items
  const containerAnimation = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemAnimation = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="w-full"
      initial="hidden"
      animate="show"
      variants={containerAnimation}
    >
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
          {(type === 'admin' || type === 'cremation') && (
            <motion.div 
              className="h-10 bg-gray-200 rounded-md w-40"
              variants={pulseAnimation}
              initial="initial"
              animate="animate"
            />
          )}
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
    </motion.div>
  );
}
