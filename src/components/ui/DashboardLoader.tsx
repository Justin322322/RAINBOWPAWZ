'use client';


interface DashboardLoaderProps {
  message?: string;
  userName?: string;
}

export default function DashboardLoader({
  _message = 'Loading your dashboard',
  userName
}: DashboardLoaderProps) {
  // Return null instead of showing a loading animation
  return null;
}
