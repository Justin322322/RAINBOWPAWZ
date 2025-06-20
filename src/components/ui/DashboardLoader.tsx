'use client';


interface DashboardLoaderProps {
  message?: string;
  _message?: string;
  _userName?: string;
}

export default function DashboardLoader({
  _message = 'Loading your dashboard',
  _userName
}: DashboardLoaderProps) {
  // Return null instead of showing a loading animation
  return null;
}
