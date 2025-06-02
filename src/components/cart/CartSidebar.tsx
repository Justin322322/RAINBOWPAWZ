'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { XMarkIcon, ShoppingCartIcon, TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useCart } from '@/contexts/CartContext';
import Image from 'next/image';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { items, removeItem, updateQuantity, totalPrice, itemCount } = useCart();
  const [isClosing, setIsClosing] = useState(false);

  // Handle closing animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  }, [onClose]);

  // Close cart when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && target.classList.contains('cart-overlay')) {
        handleClose();
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isOpen, handleClose]);

  // Handle checkout
  const handleCheckout = () => {
    if (items.length === 0) return;

    const item = items[0];

    // If pet is already selected, include it in the URL, otherwise just go to checkout
    const petParams = item.petId && item.petName
      ? `&petId=${item.petId}&petName=${encodeURIComponent(item.petName)}`
      : '';

    router.push(`/user/furparent_dashboard/bookings/checkout?provider=${item.providerId}&package=${item.packageId}&fromCart=true${petParams}`);
    handleClose();
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className="fixed inset-0 z-50 cart-overlay bg-black bg-opacity-50">
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isClosing ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold flex items-center">
              <ShoppingCartIcon className="h-6 w-6 mr-2 text-[var(--primary-green)]" />
              Your Cart ({itemCount})
            </h2>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-grow overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <ShoppingCartIcon className="h-16 w-16 mb-4" />
                <p className="text-lg">Your cart is empty</p>
                <button
                  onClick={handleClose}
                  className="mt-4 px-4 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)]"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.id} className="border rounded-lg p-3 relative">
                    <div className="flex items-start">
                      {/* Item Image */}
                      <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 relative">
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
                      <div className="ml-3 flex-grow">
                        <h3 className="font-medium">{item.packageName}</h3>
                        <p className="text-sm text-gray-500">{item.providerName}</p>
                        <p className="text-sm text-gray-500">
                          {item.category} • {item.cremationType}
                        </p>
                        <p className="text-[var(--primary-green)] font-semibold mt-1">
                          ₱{item.price.toLocaleString()}
                        </p>

                        {/* Selected Add-ons */}
                        {item.selectedAddOns.length > 0 && (
                          <div className="mt-1">
                            <p className="text-xs text-gray-500">Add-ons:</p>
                            <ul className="text-xs text-gray-700">
                              {item.selectedAddOns.map((addon, index) => (
                                <li key={index}>{addon}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Pet Information */}
                        {item.petName && (
                          <p className="text-xs text-gray-500 mt-1">
                            For: {item.petName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border rounded-md">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1 text-gray-500 hover:bg-gray-100"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="px-2 py-1">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1 text-gray-500 hover:bg-gray-100"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-4 border-t">
              <div className="flex justify-between mb-4">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-[var(--primary-green)]">
                  ₱{totalPrice.toLocaleString()}
                </span>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full py-3 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)]"
              >
                Proceed to Checkout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartSidebar;
