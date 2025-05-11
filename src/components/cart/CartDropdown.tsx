'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCartIcon,
  XMarkIcon,
  TrashIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface CartItem {
  id: number;
  providerId: number;
  providerName: string;
  packageId: number;
  packageName: string;
  price: number;
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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  
  // Mock cart items for demonstration
  useEffect(() => {
    // In a real app, this would come from localStorage, context, or an API
    const mockCartItems: CartItem[] = [
      {
        id: 1,
        providerId: 1,
        providerName: 'Rainbow Bridge Pet Cremation',
        packageId: 2,
        packageName: 'Premium Cremation',
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
        price: 3800
      }
    ];
    
    setCartItems(mockCartItems);
  }, []);
  
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
  
  const removeItem = (itemId: number) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };
  
  const proceedToCheckout = () => {
    // In a real app, you would navigate to checkout with the first item or a summary page
    if (cartItems.length > 0) {
      const item = cartItems[0];
      router.push(`/user/furparent_dashboard/bookings/checkout?provider=${item.providerId}&package=${item.packageId}`);
      onClose();
    }
  };
  
  const viewCart = () => {
    router.push('/user/furparent_dashboard/bookings/cart');
    onClose();
  };
  
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.price, 0);
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg z-50 overflow-hidden"
    >
      <div className="p-4 bg-[var(--primary-green)] text-white flex justify-between items-center">
        <h3 className="font-medium flex items-center">
          <ShoppingCartIcon className="h-5 w-5 mr-2" />
          Your Cart ({cartItems.length})
        </h3>
        <button 
          onClick={onClose}
          className="text-white hover:text-gray-200"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {cartItems.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <ShoppingCartIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p>Your cart is empty</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {cartItems.map(item => (
              <li key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.packageName}</h4>
                    <p className="text-sm text-gray-500">{item.providerName}</p>
                    {item.date && item.time && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.date).toLocaleDateString()} at {item.time}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-[var(--primary-green)]">₱{item.price.toLocaleString()}</p>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700 text-xs flex items-center mt-1 ml-auto"
                    >
                      <TrashIcon className="h-3 w-3 mr-1" />
                      Remove
                    </button>
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
            <span className="font-bold text-[var(--primary-green)]">₱{calculateTotal().toLocaleString()}</span>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={proceedToCheckout}
              className="w-full py-2 px-4 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)] transition-colors flex items-center justify-center"
            >
              Checkout <ArrowRightIcon className="h-4 w-4 ml-2" />
            </button>
            
            <button
              onClick={viewCart}
              className="w-full py-2 px-4 border border-[var(--primary-green)] text-[var(--primary-green)] rounded-md hover:bg-green-50 transition-colors"
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
