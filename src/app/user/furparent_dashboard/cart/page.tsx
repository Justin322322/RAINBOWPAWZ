'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  TrashIcon,
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  ArrowLeftIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useCart } from '@/contexts/CartContext';
import FurParentNavbar from '@/components/navigation/FurParentNavbar';
import withOTPVerification from '@/components/withOTPVerification';

interface CartPageProps {
  userData?: any;
}

function CartPage({ userData }: CartPageProps) {
  const router = useRouter();
  const { items, removeItem, updateQuantity, updateAddOns, updatePet, totalPrice, clearCart } = useCart();
  const [pets, setPets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Fetch user's pets
  useEffect(() => {
    const fetchPets = async () => {
      try {
        const response = await fetch('/api/pets');
        if (response.ok) {
          const data = await response.json();
          setPets(data.pets || []);
        } else {
          console.error('Failed to fetch pets');

          // Fallback to mock pets if API fails
          setPets([
            { id: 1, name: 'Max', species: 'Dog' },
            { id: 2, name: 'Luna', species: 'Cat' },
            { id: 3, name: 'Buddy', species: 'Dog' }
          ]);
        }
      } catch (error) {
        console.error('Error fetching pets:', error);

        // Fallback to mock pets if API fails
        setPets([
          { id: 1, name: 'Max', species: 'Dog' },
          { id: 2, name: 'Luna', species: 'Cat' },
          { id: 3, name: 'Buddy', species: 'Dog' }
        ]);
      }
    };

    fetchPets();
  }, []);

  // Handle checkout
  const handleCheckout = async () => {
    if (items.length === 0) return;

    // Check if all items have a pet selected
    const missingPet = items.some(item => !item.petId);
    if (missingPet) {
      setCheckoutError('Please select a pet for all items in your cart');
      return;
    }

    setIsLoading(true);
    setCheckoutError(null);

    try {
      // Create bookings for each item
      const bookingPromises = items.map(async (item) => {
        const bookingData = {
          packageId: item.packageId,
          providerId: item.providerId,
          petId: item.petId,
          quantity: item.quantity,
          selectedAddOns: item.selectedAddOns,
          totalPrice: calculateItemTotal(item)
        };

        const response = await fetch('/api/cart-bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bookingData)
        });

        if (!response.ok) {
          throw new Error(`Failed to create booking for ${item.packageName}`);
        }

        return await response.json();
      });

      await Promise.all(bookingPromises);

      // Clear cart and show success message
      clearCart();
      setCheckoutSuccess(true);

      // Redirect to bookings page after a delay
      setTimeout(() => {
        router.push('/user/furparent_dashboard/bookings');
      }, 3000);
    } catch (error) {
      console.error('Checkout error:', error);
      setCheckoutError(error instanceof Error ? error.message : 'Failed to complete checkout');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total price for a single item including add-ons
  const calculateItemTotal = (item: any) => {
    let total = item.price * item.quantity;

    item.selectedAddOns.forEach((addOn: string) => {
      const priceMatch = addOn.match(/\(\+₱([\d,]+)\)/);
      if (priceMatch) {
        const addOnPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
        total += addOnPrice * item.quantity;
      }
    });

    return total;
  };

  // Handle pet selection
  const handlePetChange = (itemId: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    const petId = parseInt(e.target.value);
    if (petId) {
      const pet = pets.find(p => p.id === petId);
      if (pet) {
        updatePet(itemId, petId, pet.name);
      }
    }
  };

  // Handle add-on selection
  const handleAddOnToggle = (itemId: string, addOn: string) => {
    const item = items.find(item => item.id === itemId);
    if (!item) return;

    const newSelectedAddOns = item.selectedAddOns.includes(addOn)
      ? item.selectedAddOns.filter(a => a !== addOn)
      : [...item.selectedAddOns, addOn];

    updateAddOns(itemId, newSelectedAddOns);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <FurParentNavbar activePage="services" userName={`${userData?.first_name || ''} ${userData?.last_name || ''}`} />

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
            <p className="text-gray-500 mb-6">Looks like you haven't added any services to your cart yet.</p>
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

                        {/* Item Details */}
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
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-red-500 hover:text-red-700 h-fit"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>

                          {/* Pet Selection */}
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Select Pet:
                            </label>
                            <select
                              value={item.petId || ''}
                              onChange={(e) => handlePetChange(item.id, e)}
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                            >
                              <option value="">Select a pet</option>
                              {pets.map(pet => (
                                <option key={pet.id} value={pet.id}>
                                  {pet.name} ({pet.species})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Add-ons */}
                          {item.addOns.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-gray-700 mb-1">Add-ons:</p>
                              <div className="space-y-1">
                                {item.addOns.map((addon: string, index: number) => (
                                  <label key={index} className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={item.selectedAddOns.includes(addon)}
                                      onChange={() => handleAddOnToggle(item.id, addon)}
                                      className="h-4 w-4 text-[var(--primary-green)] focus:ring-[var(--primary-green)] border-gray-300 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">{addon}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Quantity Controls */}
                          <div className="flex items-center mt-4">
                            <span className="text-sm text-gray-700 mr-2">Quantity:</span>
                            <div className="flex items-center border rounded-md">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="px-2 py-1 text-gray-500 hover:bg-gray-100"
                                disabled={item.quantity <= 1}
                              >
                                <MinusIcon className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="px-2 py-1 text-gray-500 hover:bg-gray-100"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </div>
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
                        {item.packageName} x{item.quantity}
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
                  disabled={isLoading || items.length === 0}
                  className="w-full py-3 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)] disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : 'Proceed to Checkout'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default withOTPVerification(CartPage);
