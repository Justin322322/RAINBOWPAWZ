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
  // Return null instead of showing a loading animation
  return null;
}
