import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCustomer } from '../../../contexts/CustomerContext';
import { formatPrice } from '../../../lib/security';

export function CartBar() {
  const navigate = useNavigate();
  const { cart, cartTotal, cartCount } = useCustomer();

  if (cart.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
      <div className="max-w-2xl mx-auto p-3">
        <button
          onClick={() => navigate('sepet')}
          className="w-full h-14 rounded-2xl text-white flex items-center justify-between px-5 shadow-2xl active:scale-[0.98] transition-transform"
          style={{
            backgroundColor: 'rgb(var(--brand-rgb))',
            boxShadow: '0 10px 25px -5px rgb(var(--brand-rgb) / 0.5)'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white text-xs font-bold flex items-center justify-center" style={{ color: 'rgb(var(--brand-rgb))' }}>
                {cartCount}
              </span>
            </div>
            <span className="font-semibold text-sm">Sepeti Görüntüle</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold">{formatPrice(cartTotal)}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
}
