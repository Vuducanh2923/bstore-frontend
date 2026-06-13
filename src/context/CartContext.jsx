/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getApiErrorMessage, readCollection } from "../services/api";
import { cartService } from "../services/bstoreService";
import { normalizeCartItem, normalizeProduct } from "../utils/formatters";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

function cartStorageKey(userId) {
  return `bstore_cart_id_${userId}`;
}

function getStoredCartId(userId) {
  if (!userId) {
    return "";
  }

  return localStorage.getItem(cartStorageKey(userId)) || "";
}

function setStoredCartId(userId, cartId) {
  if (!userId || !cartId) {
    return;
  }

  localStorage.setItem(cartStorageKey(userId), String(cartId));
}

function removeStoredCartId(userId) {
  if (!userId) {
    return;
  }

  localStorage.removeItem(cartStorageKey(userId));
}

function productToCartPayload(product, quantity) {
  const normalized = normalizeProduct(product?.raw || product);
  const variant =
    normalized.variants.find((item) => item.id === normalized.variantId) ||
    normalized.variants[0] ||
    {};
  const variantId = normalized.variantId || variant.id;

  if (!variantId) {
    throw new Error("Sản phẩm chưa có biến thể để thêm vào giỏ.");
  }

  const price = Number(variant.price ?? normalized.price ?? 0);

  return {
    product_variant_id: variantId,
    product_name: normalized.name,
    color: variant.color || "",
    ram: variant.ram || "",
    storage: variant.storage || "",
    price,
    quantity,
    subtotal: price * quantity,
  };
}

export function CartProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  const [cartId, setCartId] = useState(getStoredCartId(userId));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const applyCart = useCallback(
    (cart) => {
      if (!cart) {
        setCartId("");
        setItems([]);
        return [];
      }

      setStoredCartId(userId, cart.id);
      setCartId(String(cart.id));

      const list = readCollection(cart, ["items", "cart_items"]).map(
        normalizeCartItem,
      );
      setItems(list);
      return list;
    },
    [userId],
  );

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setCartId("");
      setItems([]);
      return [];
    }

    setLoading(true);
    setError("");

    try {
      const storedCartId = getStoredCartId(userId);

      if (storedCartId) {
        try {
          const cart = await cartService.getCart(storedCartId);
          return applyCart(cart);
        } catch {
          removeStoredCartId(userId);
        }
      }

      const payload = await cartService.getCarts();
      const carts = readCollection(payload, ["carts"]);
      const activeCart =
        carts.find(
          (cart) =>
            Number(cart.user_id) === Number(userId) &&
            String(cart.status || "active").toLowerCase() !== "ordered",
        ) || null;

      return applyCart(activeCart);
    } catch (err) {
      setError(getApiErrorMessage(err, "Không tải được giỏ hàng."));
      setItems([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [applyCart, isAuthenticated, userId]);

  useEffect(() => {
    const timerId = window.setTimeout(refreshCart, 0);
    return () => window.clearTimeout(timerId);
  }, [refreshCart]);

  const addToCart = useCallback(
    async (product, quantity = 1) => {
      if (!isAuthenticated || !userId) {
        const errorAuth = new Error("AUTH_REQUIRED");
        errorAuth.code = "AUTH_REQUIRED";
        throw errorAuth;
      }

      const itemPayload = productToCartPayload(product, quantity);
      const existingItem = items.find(
        (item) => Number(item.variantId) === Number(itemPayload.product_variant_id),
      );

      if (!cartId) {
        const cart = await cartService.createCart({
          user_id: userId,
          status: "active",
          items: [itemPayload],
        });
        return applyCart(cart);
      }

      if (existingItem) {
        await cartService.updateItem(existingItem.id, {
          ...existingItem.raw,
          quantity: existingItem.quantity + quantity,
          subtotal: existingItem.price * (existingItem.quantity + quantity),
        });
      } else {
        await cartService.addItem({
          ...itemPayload,
          cart_id: Number(cartId),
        });
      }

      return refreshCart();
    },
    [applyCart, cartId, isAuthenticated, items, refreshCart, userId],
  );

  const updateQuantity = useCallback(
    async (cartItemId, quantity) => {
      const item = items.find((current) => String(current.id) === String(cartItemId));

      await cartService.updateItem(cartItemId, {
        ...(item?.raw || {}),
        quantity,
        subtotal: Number(item?.price || 0) * quantity,
      });
      return refreshCart();
    },
    [items, refreshCart],
  );

  const removeItem = useCallback(
    async (cartItemId) => {
      await cartService.removeItem(cartItemId);
      return refreshCart();
    },
    [refreshCart],
  );

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const value = useMemo(
    () => ({
      addToCart,
      cartId,
      error,
      items,
      loading,
      refreshCart,
      removeItem,
      totalAmount,
      totalQuantity,
      updateQuantity,
    }),
    [
      addToCart,
      cartId,
      error,
      items,
      loading,
      refreshCart,
      removeItem,
      totalAmount,
      totalQuantity,
      updateQuantity,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
