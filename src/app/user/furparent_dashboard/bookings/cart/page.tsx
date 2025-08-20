'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ShoppingCartIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { withUserAuth } from '@/components/withAuth';
import FurParentPageSkeleton from '@/components/ui/FurParentPageSkeleton';

interface CartItem {
  id: number;
  providerId: number;
  providerName: string;
  packageId: number;
  packageName: string;
  description: string;
  price: number;
  date?: string;
  time?: string;
}

interface CartPageProps {
  _userData?: any;
}

function CartPage({ _userData }: CartPageProps) {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock cart items for demonstration
  useEffect(() => {
    // Simulate loading cart items
    const fetchCartItems = async () => {
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // In a real app, this would come from localStorage, context, or an API
        const mockCartItems: CartItem[] = [
          {
            id: 1,
            providerId: 1,
            providerName: 'Rainbow Bridge Pet Cremation',
            packageId: 2,
            packageName: 'Premium Cremation',
            description: 'Private cremation with premium urn and memorial certificate',
            price: 5500,
            date: '2023-06-15',
            time: '10:00'
          },
          {
            id: 2,
            providerId: 2,
            providerName: 'Peaceful Paws Memorial',
            packageId: 1,
            packageName: 'Eco-Friendly Basic',
            description: 'Environmentally conscious cremation with biodegradable urn',
            price: 3800
          }
        ];

        setCartItems(mockCartItems);
      } catch {
      } finally {
        setLoading(false);
      }
    };

    fetchCartItems();
  }, []);

  const removeItem = (itemId: number, event?: React.MouseEvent) => {
    // Stop event propagation if event is provided
    if (event) {
      event.stopPropagation();
    }
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  const proceedToCheckout = (item: CartItem) => {
    router.push(`/user/furparent_dashboard/bookings/checkout?provider=${item.providerId}&package=${item.packageId}`);
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.price, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation is now handled by layout */}

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            <span>Back</span>
          </button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-[var(--primary-green)] flex items-center">
            <ShoppingCartIcon className="h-8 w-8 mr-3" />
            My Cart
          </h1>
          <span className="text-gray-600">{cartItems.length} item(s)</span>
        </div>

        {loading ? (
          <FurParentPageSkeleton type="cart" />
        ) : cartItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg shadow-md p-8 text-center"
          >
            <ShoppingCartIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Looks like you haven&apos;t added any services to your cart yet.</p>
            <button
              onClick={() => router.push('/user/furparent_dashboard/services')}
              className="px-6 py-3 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)] transition-colors"
            >
              Browse Services
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="bg-[var(--primary-green)] p-6">
                  <h2 className="text-xl font-bold text-white">Cart Items</h2>
                </div>

                <ul className="divide-y divide-gray-200">
                  {cartItems.map(item => (
                    <li key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="mb-4 md:mb-0">
                          <h3 className="font-medium text-lg text-gray-900">{item.packageName}</h3>
                          <p className="text-gray-600 text-sm">{item.providerName}</p>
                          <p className="text-gray-500 text-sm mt-1">{item.description}</p>

                          {item.date && item.time ? (
                            <div className="mt-3 flex items-center text-sm text-gray-500">
                              <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                              <span>{new Date(item.date).toLocaleDateString()}</span>
                              <ClockIcon className="h-4 w-4 mx-1 text-gray-400" />
                              <span>{item.time}</span>
                            </div>
                          ) : (
                            <div className="mt-3 flex items-center text-sm text-amber-600">
                              <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                              <span>Booking details not set</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end">
                          <p className="font-bold text-lg text-[var(--primary-green)]">₱{item.price.toLocaleString()}</p>

                          <div className="mt-3 flex space-x-2">
                            <button
                              onClick={(e) => removeItem(item.id, e)}
                              className="px-3 py-1 border border-red-500 text-red-500 rounded hover:bg-red-50 text-sm flex items-center"
                            >
                              <TrashIcon className="h-4 w-4 mr-1" />
                              Remove
                            </button>

                            <button
                              onClick={() => proceedToCheckout(item)}
                              className="px-3 py-1 bg-[var(--primary-green)] text-white rounded hover:bg-[var(--primary-green-hover)] text-sm flex items-center"
                            >
                              Checkout
                              <ArrowRightIcon className="h-4 w-4 ml-1" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-lg shadow-md overflow-hidden sticky top-8"
              >
                <div className="bg-[var(--primary-green)] p-6">
                  <h2 className="text-xl font-bold text-white">Order Summary</h2>
                </div>

                <div className="p-6">
                  <div className="space-y-4 mb-6">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-gray-600">{item.packageName}</span>
                        <span className="font-medium">₱{item.price.toLocaleString()}</span>
                      </div>
                    ))}

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex justify-between">
                        <span className="font-medium">Subtotal</span>
                        <span className="font-medium">₱{calculateTotal().toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <span className="font-bold">Total</span>
                      <span className="font-bold text-[var(--primary-green)]">₱{calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-md mb-6">
                    <p className="text-sm text-gray-600">
                      Proceed to checkout to complete your booking details and payment information.
                    </p>
                  </div>

                  {cartItems.length > 0 && cartItems[0].date && cartItems[0].time ? (
                    <button
                      onClick={() => proceedToCheckout(cartItems[0])}
                      className="w-full py-3 px-4 bg-[var(--primary-green)] text-white font-medium rounded-md hover:bg-[var(--primary-green-hover)] transition-colors flex items-center justify-center"
                    >
                      Proceed to Checkout
                      <ArrowRightIcon className="h-5 w-5 ml-2" />
                    </button>
                  ) : (
                    <div className="text-center">
                      <p className="text-amber-600 text-sm mb-3">
                        Please set booking details for at least one item
                      </p>
                      <button
                        disabled
                        className="w-full py-3 px-4 bg-gray-300 text-gray-500 font-medium rounded-md cursor-not-allowed"
                      >
                        Proceed to Checkout
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default withUserAuth(CartPage);
