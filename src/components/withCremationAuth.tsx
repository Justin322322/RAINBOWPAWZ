'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fastAuthCheck } from '@/utils/auth';
import AuthLoadingScreen from '@/components/AuthLoadingScreen';

// Define the shape of the cremation center data
interface CremationData {
    user_id: number;
    business_name: string;
    email: string;
    first_name: string;
    last_name: string;
    provider_id: number;
    business_type: string;
    user_type?: string;
    [key: string]: any; // Allow for other properties
}

// Global state to prevent re-verification on page navigation
let globalCremationAuthState = {
    verified: false,
    cremationData: null as CremationData | null,
};

// Function to clear global cremation auth state (for logout)
export const clearGlobalCremationAuthState = () => {
    globalCremationAuthState = {
        verified: false,
        cremationData: null,
    };
};

// HOC to wrap components that require cremation center authentication
const withCremationAuth = <P_Original extends object>(
    WrappedComponent: React.ComponentType<P_Original & { cremationData: CremationData }>
) => {
    const WithCremationAuthComponent: React.FC<P_Original> = (props) => {
        const router = useRouter();
        const [isAuthenticated, setIsAuthenticated] = useState(globalCremationAuthState.verified);
        const [retrievedCremationData, setRetrievedCremationData] = useState<CremationData | null>(globalCremationAuthState.cremationData);

        useEffect(() => {
            if (globalCremationAuthState.verified && globalCremationAuthState.cremationData) {
                // Ensure local state is also up-to-date if global state was already set
                if (!retrievedCremationData) setRetrievedCremationData(globalCremationAuthState.cremationData);
                if (!isAuthenticated) setIsAuthenticated(globalCremationAuthState.verified);
                return;
            }

            const fastCheck = fastAuthCheck();
            if (fastCheck.authenticated && fastCheck.accountType === 'business' && fastCheck.userData) {
                setRetrievedCremationData(fastCheck.userData);
                setIsAuthenticated(true);
                globalCremationAuthState = {
                    verified: true,
                    cremationData: fastCheck.userData
                };
                return;
            }

            const cachedCremationData = sessionStorage.getItem('cremation_data');
            if (cachedCremationData) {
                try {
                    const parsedData = JSON.parse(cachedCremationData);
                    setRetrievedCremationData(parsedData);
                    setIsAuthenticated(true);
                    globalCremationAuthState = {
                        verified: true,
                        cremationData: parsedData
                    };
                    return;
                } catch {
                    sessionStorage.removeItem('cremation_data');
                }
            }

            const checkAuth = async () => {
                try {
                    // Use the same secure API approach as admin auth
                    const response = await fetch('/api/auth/check', {
                        method: 'GET',
                        credentials: 'include', // Include httpOnly cookies
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache'
                        },
                    });

                    if (!response.ok) {
                        if (response.status === 401 || response.status === 403) {
                            // Don't redirect if user is currently logging out
                            const isLoggingOut = sessionStorage.getItem('is_logging_out') === 'true';
                            if (!isLoggingOut) {
                                router.replace('/');
                            }
                            return;
                        }
                        throw new Error('Auth check failed');
                    }

                    const result = await response.json();

                    if (!result.authenticated || result.accountType !== 'business') {
                        // Don't redirect if user is currently logging out
                        const isLoggingOut = sessionStorage.getItem('is_logging_out') === 'true';
                        if (!isLoggingOut) {
                            router.replace('/');
                        }
                        return;
                    }

                    // Now fetch cremation center data using the verified user ID
                    if (result.userId) {
                        await fetchCremationData(result.userId);
                        return;
                    }

                    // If we get here, no valid auth token was found
                    router.replace('/');
                } catch {
                    router.replace('/');
                }
            };

            // Helper function to fetch cremation center data
            const fetchCremationData = async (userId: string) => {
                try {
                    const response = await fetch(`/api/cremation/profile`);

                    if (!response.ok) {
                        // Try to get the error message
                        try {
                            const _errorData = await response.json();
                        } catch {
                        }

                        // Don't redirect if user is currently logging out
                        const isLoggingOut = sessionStorage.getItem('is_logging_out') === 'true';
                        if (!isLoggingOut) {
                            router.replace('/');
                        }
                        return;
                    }

                    const result = await response.json();
                    const fetchedCremationData = result.profile;

                    if (!fetchedCremationData || !fetchedCremationData.provider_id) {
                        // Don't redirect if user is currently logging out
                        const isLoggingOut = sessionStorage.getItem('is_logging_out') === 'true';
                        if (!isLoggingOut) {
                            router.replace('/');
                        }
                        return;
                    }

                    setRetrievedCremationData(fetchedCremationData);
                    setIsAuthenticated(true);
                    sessionStorage.setItem('cremation_data', JSON.stringify(fetchedCremationData));
                    globalCremationAuthState = { verified: true, cremationData: fetchedCremationData };
                } catch {
                    router.replace('/');
                }
            };
            checkAuth();
        }, [router, retrievedCremationData, isAuthenticated]);

        if (!isAuthenticated || !retrievedCremationData) {
            return <AuthLoadingScreen />;
        }

        // Pass props directly without processing
        return <WrappedComponent {...props} cremationData={retrievedCremationData} />;
    };
    return WithCremationAuthComponent;
};

export default withCremationAuth;