'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuthStatus } from '@/utils/auth';

interface WithAuthProps {
  requiredAccountType?: 'user' | 'admin' | 'business';
}

export default function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  { requiredAccountType }: WithAuthProps = {}
) {
  return function ProtectedRoute(props: P) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
      const verifyAuth = async () => {
        try {
          const { authenticated, accountType } = await checkAuthStatus();

          if (!authenticated) {
            router.replace('/');
            return;
          }

          // If a specific account type is required, check it
          if (requiredAccountType && accountType !== requiredAccountType) {
            router.replace('/');
            return;
          }

          setIsAuthenticated(true);
        } catch {
          router.replace('/');
        } finally {
          setIsLoading(false);
        }
      };

      verifyAuth();
    }, [router]);

    if (isLoading) {
      return null;
    }

    // Pass props directly without processing
    return isAuthenticated ? <Component {...props} /> : null;
  };
}
