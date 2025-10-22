"use client"

import { useState, useEffect, useCallback } from 'react'
import type { Database } from '@/lib/database.types'

type Product = Database["public"]["Tables"]["products"]["Row"]

export interface CartItem {
  productId: string
  quantity: number
  product?: Product
}

export interface CartState {
  items: CartItem[]
  total: number
  itemCount: number
}

const CART_STORAGE_KEY = 'ecommerce_cart'

export function useEcommerceCart() {
  const [cart, setCart] = useState<CartState>({
    items: [],
    total: 0,
    itemCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY)
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        setCart(parsedCart)
      } catch (err) {
        console.error('Error loading cart:', err)
      }
    }
    setIsLoading(false)
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    }
  }, [cart, isLoading])

  const calculateTotal = useCallback((items: CartItem[]) => {
    return items.reduce((sum, item) => {
      const price = (item.product?.price || 0) / 1000
      return sum + price * item.quantity
    }, 0)
  }, [])

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.items.find(item => item.productId === product.id)

      let newItems: CartItem[]
      if (existingItem) {
        newItems = prevCart.items.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      } else {
        newItems = [...prevCart.items, { productId: product.id, quantity, product }]
      }

      const total = calculateTotal(newItems)
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)

      return { items: newItems, total, itemCount }
    })
  }, [calculateTotal])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(prevCart => {
      const newItems = prevCart.items.map(item =>
        item.productId === productId ? { ...item, quantity } : item
      )

      const total = calculateTotal(newItems)
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)

      return { items: newItems, total, itemCount }
    })
  }, [calculateTotal])

  const removeFromCart = useCallback((productId: string) => {
    setCart(prevCart => {
      const newItems = prevCart.items.filter(item => item.productId !== productId)
      const total = calculateTotal(newItems)
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)

      return { items: newItems, total, itemCount }
    })
  }, [calculateTotal])

  const clearCart = useCallback(() => {
    setCart({ items: [], total: 0, itemCount: 0 })
    localStorage.removeItem(CART_STORAGE_KEY)
  }, [])

  const attachProductData = useCallback((items: CartItem[], products: Product[]) => {
    return items.map(item => ({
      ...item,
      product: products.find(p => p.id === item.productId),
    }))
  }, [])

  return {
    cart,
    isLoading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    attachProductData,
    calculateTotal,
  }
}
