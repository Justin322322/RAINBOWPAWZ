'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface DashboardLoaderProps {
  message?: string;
  userName?: string;
}

export default function DashboardLoader({ 
  message = 'Loading your dashboard', 
  userName 
}: DashboardLoaderProps) {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
      <div className="w-full max-w-md mx-auto text-center">
        {/* Logo animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Image 
            src="/logo.png" 
            alt="Rainbow Paws Logo" 
            width={80} 
            height={80} 
            className="mx-auto"
          />
        </motion.div>
        
        {/* Welcome message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-2xl font-medium text-gray-800 mb-2">
            {userName ? `Welcome, ${userName}` : 'Welcome back'}
          </h1>
          <p className="text-gray-600 mb-8">{message}</p>
        </motion.div>
        
        {/* Loading animation */}
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="h-1 bg-[var(--primary-green)] rounded-full max-w-xs mx-auto"
        />
        
        {/* Loading dots */}
        <div className="flex justify-center mt-6 space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.3, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatType: "reverse",
                delay: i * 0.2,
              }}
              className="w-3 h-3 rounded-full bg-[var(--primary-green)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
