'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the cart item type
export interface CartItem {
  id: string;
  packageId: number;
  providerId: number;
  providerName: string;
  packageName: string;
  price: number;
  quantity: number;
  category: string;
  cremationType: string;
  processingTime: string;
  petId?: number;
  petName?: string;
  addOns: string[];
  selectedAddOns: string[];
  image?: string;
}

// Define the cart context type
interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateAddOns: (id: string, selectedAddOns: string[]) => void;
  updatePet: (id: string, petId: number, petName: string) => void;
  clearCart: () => void;
  itemCount: number;
  totalPrice: number;
}

// Create the cart context with default values
const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  updateAddOns: () => {},
  updatePet: () => {},
  clearCart: () => {},
  itemCount: 0,
  totalPrice: 0,
});

// Custom hook to use the cart context
export const useCart = () => useContext(CartContext);

// Cart provider component
export const CartProvider = ({ children }: { children: ReactNode }) => {
  // Initialize cart from localStorage if available
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load cart from localStorage on component mount
  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        setItems(JSON.parse(storedCart));
      } catch (error) {
        setItems([]);
      }
    }
    setLoaded(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('cart', JSON.stringify(items));
    }
  }, [items, loaded]);

  // Calculate total price and item count
  const totalPrice = items.reduce((total, item) => {
    // Calculate base price
    let itemTotal = item.price * item.quantity;
    
    // Add selected add-ons prices
    item.selectedAddOns.forEach(addOn => {
      const priceMatch = addOn.match(/\(\+₱([\d,]+)\)/);
      if (priceMatch) {
        const addOnPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
        itemTotal += addOnPrice * item.quantity;
      }
    });
    
    return total + itemTotal;
  }, 0);

  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  // Add an item to the cart
  const addItem = (newItem: CartItem) => {
    setItems(prevItems => {
      // Generate a unique ID for the item if not provided
      const itemWithId = {
        ...newItem,
        id: newItem.id || `${newItem.packageId}-${Date.now()}`
      };
      
      // Check if the item already exists in the cart
      const existingItemIndex = prevItems.findIndex(item => item.id === itemWithId.id);
      
      if (existingItemIndex >= 0) {
        // Update existing item
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + itemWithId.quantity,
          selectedAddOns: itemWithId.selectedAddOns
        };
        return updatedItems;
      } else {
        // Add new item
        return [...prevItems, itemWithId];
      }
    });
  };

  // Remove an item from the cart
  const removeItem = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  // Update the quantity of an item
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  // Update the selected add-ons for an item
  const updateAddOns = (id: string, selectedAddOns: string[]) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, selectedAddOns } : item
      )
    );
  };

  // Update the pet information for an item
  const updatePet = (id: string, petId: number, petName: string) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, petId, petName } : item
      )
    );
  };

  // Clear the cart
  const clearCart = () => {
    setItems([]);
  };

  // Provide the cart context to children
  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      updateAddOns,
      updatePet,
      clearCart,
      itemCount,
      totalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
};
