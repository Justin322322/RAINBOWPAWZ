'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ShoppingCartIcon,
  XMarkIcon,
  TrashIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useCart } from '@/contexts/CartContext';

interface CartItem {
  id: string;
  providerId: number;
  providerName: string;
  packageId: number;
  packageName: string;
  price: number;
  quantity: number;
  image?: string;
  petId?: string;
  petName?: string;
  date?: string;
  time?: string;
}

interface CartDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartDropdown = ({ isOpen, onClose }: CartDropdownProps) => {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get cart items from context
  const { items: cartItems, removeItem, totalPrice } = useCart();
  const typedCartItems = cartItems as CartItem[];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Prevent clicks inside the dropdown from closing it
  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleRemoveItem = (itemId: string, event: React.MouseEvent) => {
    // Stop event propagation to prevent modal from closing
    event.stopPropagation();
    removeItem(itemId);
  };

  const proceedToCheckout = () => {
    // Check if we have cart items and valid data before proceeding
    if (typedCartItems.length === 0) {
      onClose();
      return;
    }

    const item = typedCartItems[0];
    
    // Validate that we have the required IDs for direct checkout
    if (item.providerId && item.packageId) {
      // Direct checkout with valid data
      const petParams = item.petId && item.petName
        ? `&petId=${item.petId}&petName=${encodeURIComponent(item.petName)}`
        : '';
      router.push(`/user/furparent_dashboard/bookings/checkout?provider=${item.providerId}&package=${item.packageId}&fromCart=true${petParams}`);
    } else {
      // Fallback to cart page if data is incomplete
      router.push('/user/furparent_dashboard/cart');
    }
    onClose();
  };

  const viewCart = () => {
    router.push('/user/furparent_dashboard/cart');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      onClick={handleDropdownClick}
      className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white rounded-lg shadow-xl border border-gray-200 z-[60] overflow-hidden"
      data-cart-dropdown
    >
      <div className="p-4 bg-[var(--primary-green,#10b981)] text-white flex justify-between items-center">
        <h3 className="font-medium flex items-center">
          <ShoppingCartIcon className="h-5 w-5 mr-2" />
          Your Cart ({typedCartItems.reduce((total, item) => total + item.quantity, 0)})
        </h3>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {typedCartItems.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <ShoppingCartIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p>Your cart is empty</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {typedCartItems.map(item => (
              <li key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex">
                  {/* Item Image */}
                  <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 relative mr-3">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.packageName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-gray-400 text-xs">No image</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.packageName}</h4>
                        <p className="text-sm text-gray-500">{item.providerName}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-[var(--primary-green,#10b981)]">₱{item.price.toLocaleString()}</p>
                        <button
                          onClick={(e) => handleRemoveItem(item.id, e)}
                          className="text-red-500 hover:text-red-700 text-xs flex items-center mt-1 ml-auto"
                        >
                          <TrashIcon className="h-3 w-3 mr-1" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex justify-between mb-4">
            <span className="font-medium">Total:</span>
            <span className="font-bold text-[var(--primary-green,#10b981)]">₱{totalPrice.toLocaleString()}</span>
          </div>

          <div className="space-y-2">
            <button
              onClick={proceedToCheckout}
              className="w-full py-2 px-4 bg-[var(--primary-green,#10b981)] text-white rounded-md hover:bg-[var(--primary-green-hover)] transition-colors flex items-center justify-center"
            >
              Checkout <ArrowRightIcon className="h-4 w-4 ml-2" />
            </button>

            <button
              onClick={viewCart}
              className="w-full py-2 px-4 border border-[var(--primary-green,#10b981)] text-[var(--primary-green,#10b981)] rounded-md hover:bg-green-50 transition-colors"
            >
              View Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartDropdown;
