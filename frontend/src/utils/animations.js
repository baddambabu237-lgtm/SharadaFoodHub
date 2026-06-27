import { useState, useEffect } from 'react';

/**
 * Trigger flying circle from click event target coordinates to the cart badge target.
 * @param {MouseEvent|React.MouseEvent} e - React or DOM mouse event.
 */
export const triggerFlyAnimation = (e) => {
  const cartIcon = document.getElementById('cart-icon-nav');
  if (!cartIcon) return;

  const rect = cartIcon.getBoundingClientRect();
  const startX = e.clientX;
  const startY = e.clientY;

  const flyer = document.createElement('div');
  flyer.className = 'add-to-cart-flyer';
  flyer.style.left = `${startX - 10}px`;
  flyer.style.top = `${startY - 10}px`;
  document.body.appendChild(flyer);

  // Trigger repaint to register start coordinates before moving
  void flyer.offsetWidth;

  requestAnimationFrame(() => {
    flyer.style.transform = `translate(${rect.left - startX + 15}px, ${rect.top - startY + 15}px) scale(0.15)`;
    flyer.style.opacity = '0';
  });

  setTimeout(() => {
    flyer.remove();
    cartIcon.classList.add('animate-cartpop');
    setTimeout(() => cartIcon.classList.remove('animate-cartpop'), 400);
  }, 600);
};

/**
 * Hook to count up to a number smoothly.
 * @param {number} value - Target value.
 * @param {number} duration - Animation duration in ms.
 * @returns {number} Current animated counter value.
 */
export const useAnimatedCounter = (value, duration = 1000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10);
    if (isNaN(end)) {
      setCount(value);
      return;
    }
    if (end <= 0) {
      setCount(0);
      return;
    }

    const startTime = performance.now();

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (easeOutQuad)
      const easeProgress = progress * (2 - progress);
      const current = Math.floor(easeProgress * end);
      
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(update);
  }, [value, duration]);

  return count;
};
