const CART_PREFIX = 'qrmasa_cart';

function getCartKey(venueSlug, tableNumber) {
  return `${CART_PREFIX}:${venueSlug}:${String(tableNumber)}`;
}

export function loadCart(venueSlug, tableNumber) {
  try {
    const raw = localStorage.getItem(getCartKey(venueSlug, tableNumber));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item.quantity > 0) : [];
  } catch {
    return [];
  }
}

export function saveCart(venueSlug, tableNumber, cart) {
  localStorage.setItem(getCartKey(venueSlug, tableNumber), JSON.stringify(cart));
}

export function addProductToCart(cart, product) {
  const current = cart.find((item) => item.id === product.id);

  if (current) {
    return cart.map((item) =>
      item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
    );
  }

  return [
    ...cart,
    {
      id: product.id,
      name: product.name,
      price: Number(product.price || 0),
      imageUrl: product.imageUrl || '',
      quantity: 1,
    },
  ];
}

export function changeCartQuantity(cart, productId, delta) {
  return cart
    .map((item) =>
      item.id === productId ? { ...item, quantity: item.quantity + delta } : item,
    )
    .filter((item) => item.quantity > 0);
}

export function removeCartItem(cart, productId) {
  return cart.filter((item) => item.id !== productId);
}

export function getCartCount(cart) {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

export function getCartTotal(cart) {
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}
