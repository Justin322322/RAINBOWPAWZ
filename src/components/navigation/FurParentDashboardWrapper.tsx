'use client';

import React from 'react';
import ReviewNotificationBanner from '../reviews/ReviewNotificationBanner';

interface FurParentDashboardWrapperProps {
  children: React.ReactNode;
  userData?: any;
}

/**
 * Wrapper component for the fur parent dashboard that includes the review notification banner
 * This component should be used to wrap the content of each fur parent dashboard page
 */
const FurParentDashboardWrapper: React.FC<FurParentDashboardWrapperProps> = ({ 
  children,
  userData
}) => {
  return (
    <>
      {userData && userData.id && (
        <ReviewNotificationBanner userId={userData.id} />
      )}
      {children}
    </>
  );
};

export default FurParentDashboardWrapper;
