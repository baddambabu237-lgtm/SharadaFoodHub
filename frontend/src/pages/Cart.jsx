import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

const Cart = ({ cart, updateCartQuantity, removeFromCart }) => {
  const userStr = localStorage.getItem('sharadha_user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal >= 200 ? 0 : 50;
  const grandTotal = subtotal + shippingFee;

  if (cart.length === 0) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-6 py-20 animate-fadein">
        <div className="w-16 h-16 bg-warmgray-100 rounded-full flex items-center justify-center mx-auto text-warmgray-400 dark:bg-warmgray-800">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-display text-warmgray-900 dark:text-white">Your Cart is Empty</h2>
          <p className="text-sm text-warmgray-400">Add some delicious homemade items to your cart to checkout.</p>
        </div>
        <Link
          to="/catalog"
          className="inline-flex px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md transition-colors"
        >
          Browse Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-fadein">
      <div>
        <h1 className="text-3xl font-extrabold text-warmgray-900 font-display dark:text-white">Shopping Cart</h1>
        <p className="text-sm text-warmgray-500 dark:text-warmgray-400">Review your selected homemade goods</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Cart Items List */}
        <div className="flex-1 space-y-4">
          {cart.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-2xl border border-warmgray-100 shadow-sm dark:bg-warmgray-800 dark:border-warmgray-700 flex items-center gap-4"
            >
              <img
                src={item.image_url}
                alt={item.name}
                className="w-20 h-20 object-cover rounded-xl bg-warmgray-50 border border-warmgray-100 dark:border-warmgray-700"
              />
              <div className="flex-1">
                <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">{item.category_name}</span>
                <h3 className="text-sm font-bold text-warmgray-900 dark:text-white font-display truncate">{item.name}</h3>
                <p className="text-xs text-warmgray-400">{item.weight}</p>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center border border-warmgray-200 rounded-xl overflow-hidden bg-warmgray-50 dark:border-warmgray-700 dark:bg-warmgray-900">
                <button
                  onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                  className="px-3 py-1.5 text-warmgray-600 hover:bg-warmgray-100 dark:text-warmgray-300 dark:hover:bg-warmgray-800 transition-colors font-bold"
                >
                  -
                </button>
                <span className="px-3 py-1.5 text-xs font-bold text-warmgray-850 dark:text-white">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                  className="px-3 py-1.5 text-warmgray-600 hover:bg-warmgray-100 dark:text-warmgray-300 dark:hover:bg-warmgray-800 transition-colors font-bold"
                >
                  +
                </button>
              </div>

              {/* Price & Delete */}
              <div className="flex flex-col items-end gap-2 pl-4">
                <span className="text-sm font-black text-warmgray-900 dark:text-white">₹{item.price * item.quantity}</span>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-1 rounded-lg text-warmgray-400 hover:bg-red-50 hover:text-red-650 dark:hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Checkout summary card */}
        <div className="w-full lg:w-80">
          <div className="bg-white p-6 rounded-3xl border border-warmgray-100 shadow-xl dark:bg-warmgray-800 dark:border-warmgray-700 space-y-6 sticky top-24">
            <h3 className="text-lg font-bold font-display text-warmgray-900 dark:text-white border-b border-warmgray-50 dark:border-warmgray-700 pb-3">
              Order Summary
            </h3>
            
            <div className="space-y-2">
              {subtotal < 200 ? (
                <div className="p-3 bg-brand-50 text-brand-700 rounded-2xl text-[11px] font-bold dark:bg-brand-950/20 dark:text-brand-400">
                  🚚 Add ₹{200 - subtotal} more to get FREE Shipping
                </div>
              ) : (
                <div className="p-3 bg-green-50 text-green-700 rounded-2xl text-[11px] font-bold dark:bg-green-950/20 dark:text-green-400">
                  🎉 You have unlocked FREE Shipping
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs text-warmgray-500 dark:text-warmgray-400">
                <span>Subtotal</span>
                <span className="font-semibold text-warmgray-800 dark:text-white">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-xs text-warmgray-500 dark:text-warmgray-400">
                <span>Shipping</span>
                <span className={`font-semibold ${shippingFee === 0 ? 'text-green-600' : 'text-warmgray-800 dark:text-white'}`}>
                  {shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-warmgray-900 dark:text-white border-t border-warmgray-50 dark:border-warmgray-700 pt-3">
                <span>Grand Total</span>
                <span className="text-brand-600 dark:text-brand-400">₹{grandTotal}</span>
              </div>
            </div>

            <Link
              to="/checkout"
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md shadow-brand-500/10 flex items-center justify-center space-x-2 transition-colors"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </Link>

            <Link
              to="/checkout?mode=subscription"
              className="w-full py-3 bg-white hover:bg-brand-50 text-brand-600 font-bold rounded-xl border border-brand-200 shadow-sm flex items-center justify-center space-x-2 transition-colors dark:bg-warmgray-850 dark:border-warmgray-700 dark:text-brand-400 dark:hover:bg-warmgray-800"
            >
              <span>Checkout as Subscription (Save 15%)</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </Link>

            <Link
              to="/catalog"
              className="block text-center text-xs font-bold text-warmgray-400 hover:text-brand-600 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
