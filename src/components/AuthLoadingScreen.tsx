'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

const AuthLoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-50 to-white">
      <div className="text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Image
            src="/logo.png"
            alt="Rainbow Paws Logo"
            width={80}
            height={80}
            className="h-20 w-auto mx-auto mb-4"
          />
        </motion.div>

        {/* Rainbow Paws Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <span className="text-3xl font-medium modern-heading text-[var(--primary-green)] tracking-wide">
            RainbowPaws
          </span>
        </motion.div>

        {/* Loading Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-6"
        >
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-[var(--primary-green)]/30 border-t-[var(--primary-green)] rounded-full animate-spin"></div>
          </div>
        </motion.div>

        {/* Loading Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-gray-600 modern-text"
        >
          Setting up your dashboard...
        </motion.p>
      </div>
    </div>
  );
};

export default AuthLoadingScreen;
