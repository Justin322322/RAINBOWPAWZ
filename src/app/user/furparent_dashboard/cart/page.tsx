'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  TrashIcon,
  ShoppingCartIcon,
  ArrowLeftIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useCart } from '@/contexts/CartContext';
import { withUserAuth } from '@/components/withAuth';

interface CartPageProps {
  _userData?: any;
}

function CartPage({ _userData }: CartPageProps) {
  const router = useRouter();
  const { items, removeItem, totalPrice } = useCart();
  const [_isLoading, _setIsLoading] = useState(false);
  const [checkoutSuccess, _setCheckoutSuccess] = useState(false);
  const [checkoutError, _setCheckoutError] = useState<string | null>(null);

  // Handle checkout
  const handleCheckout = () => {
    if (items.length === 0) return;

    // Always redirect to the checkout page with the first item's details
    // The checkout page will handle the item from the cart context
    const item = items[0];

    // Validate that we have the required IDs
    if (!item.providerId || !item.packageId) {
      console.error('Cart item missing provider or package ID:', item);
      // Fallback: try to extract from other fields or redirect to services
      router.push('/user/furparent_dashboard/services');
      return;
    }

    // If pet is already selected, include it in the URL, otherwise just go to checkout
    const petParams = item.petId && item.petName
      ? `&petId=${item.petId}&petName=${encodeURIComponent(item.petName)}`
      : '';

    router.push(`/user/furparent_dashboard/bookings/checkout?provider=${item.providerId}&package=${item.packageId}&fromCart=true${petParams}`);
  };

  // Calculate total price for a single item including add-ons
  const calculateItemTotal = (item: any) => {
    let total = item.price;

    // Add-ons are now handled at checkout
    return total;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] mb-6"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          <span>Continue Shopping</span>
        </button>

        <h1 className="text-3xl font-bold mb-8 flex items-center">
          <ShoppingCartIcon className="h-8 w-8 mr-3 text-[var(--primary-green)]" />
          Your Cart
        </h1>

        {checkoutSuccess ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckIcon className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-green-800 mb-2">Order Placed Successfully!</h2>
            <p className="text-green-700 mb-4">Your bookings have been created and are being processed.</p>
            <p className="text-green-600">You will be redirected to your bookings page shortly...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <ShoppingCartIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Looks like you haven&apos;t added any services to your cart yet.</p>
            <button
              onClick={() => router.push('/user/furparent_dashboard/services')}
              className="px-6 py-3 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)]"
            >
              Browse Services
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <li key={item.id} className="p-6">
                      <div className="flex flex-col sm:flex-row">
                        {/* Item Image */}
                        <div className="w-full sm:w-32 h-32 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 relative mb-4 sm:mb-0">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.packageName}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <span className="text-gray-400">No image</span>
                            </div>
                          )}
                        </div>

                        {/* Item Details - Simplified */}
                        <div className="sm:ml-6 flex-grow">
                          <div className="flex justify-between">
                            <div>
                              <h3 className="text-lg font-medium">{item.packageName}</h3>
                              <p className="text-sm text-gray-500">{item.providerName}</p>
                              <p className="text-sm text-gray-500">
                                {item.category} • {item.cremationType} • {item.processingTime}
                              </p>
                              <p className="text-[var(--primary-green)] font-semibold mt-1">
                                ₱{item.price.toLocaleString()}
                              </p>

                              {/* Only show selected pet if available */}
                              {item.petId && item.petName && (
                                <p className="text-sm text-gray-700 mt-2">
                                  <span className="font-medium">Selected Pet:</span> {item.petName}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-red-500 hover:text-red-700 h-fit"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.packageName}
                      </span>
                      <span className="font-medium">
                        ₱{calculateItemTotal(item).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-[var(--primary-green)]">
                      ₱{totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>

                {checkoutError && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
                    {checkoutError}
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={items.length === 0}
                  className="w-full py-3 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)] disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default withUserAuth(CartPage);
