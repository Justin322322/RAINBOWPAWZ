'use client';

import React, { useEffect } from 'react';
// Notification utilities removed

interface FurParentDashboardWrapperProps {
  children: React.ReactNode;
  userData?: any;
}

/**
 * Wrapper component for the fur parent dashboard that creates review notifications
 * This component should be used to wrap the content of each fur parent dashboard page
 */
const FurParentDashboardWrapper: React.FC<FurParentDashboardWrapperProps> = ({
  children,
  userData
}) => {
  useEffect(() => {
    // Create review notifications if user has pending reviews
    const checkAndCreateReviewNotifications = async () => {
      if (!userData || !userData.id) return;

      // Check if we should create a notification (rate limiting)
      const lastNotificationKey = `lastReviewNotification_${userData.id}`;
      const lastNotificationTime = localStorage.getItem(lastNotificationKey);

      if (lastNotificationTime) {
        const oneDayInMs = 24 * 60 * 60 * 1000;
        const timeSinceLastNotification = Date.now() - parseInt(lastNotificationTime);
        if (timeSinceLastNotification < oneDayInMs) {
          return; // Don't send notification yet
        }
      }

      try {
        // Fetch pending reviews
        const response = await fetch('/api/reviews/pending', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) return;

        const data = await response.json();
        if (!data.pendingReviews || !Array.isArray(data.pendingReviews)) return;

        const pendingCount = data.pendingReviews.length;
        if (pendingCount === 0) return;

        // Create notification using existing system
        const _title = 'Review Reminder';
        const _message = `You have ${pendingCount} completed ${pendingCount === 1 ? 'booking' : 'bookings'} that ${pendingCount === 1 ? 'needs' : 'need'} a review`;
        const _link = '/user/furparent_dashboard/bookings?filter=completed';

        // Notification creation removed - functionality disabled

        // Mark notification as sent
        localStorage.setItem(lastNotificationKey, Date.now().toString());
      } catch (error) {
        console.error('Error creating review notifications:', error);
      }
    };

    checkAndCreateReviewNotifications();
  }, [userData]);

  return (
    <>
      {children}
    </>
  );
};

export default FurParentDashboardWrapper;
