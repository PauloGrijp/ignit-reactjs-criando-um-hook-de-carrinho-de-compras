import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: { amount } } = await api.get<Stock>(`/stock/${productId}`);
      const { data: product } = await api.get<Product>(`/products/${productId}`);

      const isProductExist = cart.find((product) => product.id === productId);

      if (amount === isProductExist?.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if (isProductExist) {
        const newCart = cart.map((item) => {
          if (item.id === productId) {
            return { ...item, amount: item.amount + 1 }
          }
          return item;
        });

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }

      if (!isProductExist) {
        const addAmount = {
          ...product,
          amount: 1,
        }
        setCart([...cart, addAmount])
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, addAmount]));
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isProductExist = cart.some((item) => item.id === productId);

      if (!isProductExist) return toast.error('Erro na remoção do produto');

      const filterItem = cart.filter((item) => item.id !== productId);

      setCart(filterItem);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(filterItem));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data } = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = data.amount;
      const isProductExist = cart.find((item) => item.id === productId)

      if (amount < 1) return toast.error('Erro na alteração de quantidade do produto');

      if (isProductExist) {
        if (stockAmount >= amount) {
          const newCart = cart.map((item) => {
            if (item.id === productId) {
              return { ...item, amount }
            }
            return item
          })
          setCart(newCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

        } else {
          return toast.error('Quantidade solicitada fora de estoque');
        }

      } else {
        return toast.error('Erro na alteração de quantidade do produto');
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
