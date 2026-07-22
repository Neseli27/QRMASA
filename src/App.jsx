import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import CustomerMenu from './pages/customer/CustomerMenu';
import PanelLogin from './pages/panel/PanelLogin';
import WaiterPanel from './pages/panel/WaiterPanel';
import KitchenPanel from './pages/panel/KitchenPanel';
import ManagerAccountSecure from './pages/panel/ManagerAccountSecure';
import ManagerPanel from './pages/panel/ManagerPanel';
import MenuManagement from './pages/panel/MenuManagement';
import StaffManagement from './pages/panel/StaffManagement';
import TableManagement from './pages/panel/TableManagement';
import SuperAdmin from './pages/admin/SuperAdmin';
import NotFound from './pages/NotFound';
import ManagerCloudSyncSafe from './components/ManagerCloudSyncSafe';
import ManagerGate from './components/ManagerGate';
import ManagerLayout from './components/ManagerLayout';

function ProtectedManager({ children }) {
  return <ManagerGate>{children}</ManagerGate>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ManagerCloudSyncSafe />
      <Routes>
        {/* Ana sayfa */}
        <Route path="/" element={<Landing />} />

        {/* Müşteri tarafı */}
        <Route path="/m/:slug/:table" element={<CustomerMenu />} />

        {/* Bağımsız personel ekranları */}
        <Route path="/panel/giris" element={<PanelLogin />} />
        <Route path="/panel/garson" element={<WaiterPanel />} />
        <Route path="/panel/mutfak" element={<KitchenPanel />} />

        {/* İşletme hesabı */}
        <Route path="/panel/hesap" element={<ManagerAccountSecure />} />

        {/* Kalıcı yönetim paneli */}
        <Route
          path="/panel/yonetici"
          element={(
            <ProtectedManager>
              <ManagerLayout />
            </ProtectedManager>
          )}
        >
          <Route index element={<ManagerPanel />} />
          <Route path="siparisler" element={<WaiterPanel />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="personel" element={<StaffManagement />} />
          <Route path="masalar" element={<TableManagement />} />
          <Route path="mutfak" element={<KitchenPanel />} />
        </Route>

        {/* Süperadmin */}
        <Route path="/admin" element={<SuperAdmin />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
