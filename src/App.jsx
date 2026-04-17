import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import CustomerMenu from './pages/customer/CustomerMenu';
import PanelLogin from './pages/panel/PanelLogin';
import WaiterPanel from './pages/panel/WaiterPanel';
import KitchenPanel from './pages/panel/KitchenPanel';
import ManagerPanel from './pages/panel/ManagerPanel';
import SuperAdmin from './pages/admin/SuperAdmin';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ana sayfa */}
        <Route path="/" element={<Landing />} />

        {/* Müşteri tarafı */}
        <Route path="/m/:slug/:table" element={<CustomerMenu />} />

        {/* Personel paneli */}
        <Route path="/panel/giris" element={<PanelLogin />} />
        <Route path="/panel/garson" element={<WaiterPanel />} />
        <Route path="/panel/mutfak" element={<KitchenPanel />} />
        <Route path="/panel/yonetici" element={<ManagerPanel />} />

        {/* Süperadmin */}
        <Route path="/admin" element={<SuperAdmin />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
