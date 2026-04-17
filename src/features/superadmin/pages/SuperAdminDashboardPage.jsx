import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Building2, ShoppingBag, Users, ArrowRight } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collections } from '../../../lib/paths';
import { StatCard } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState({ totalVenues: 0, publishedVenues: 0 });

  useEffect(() => {
    const q = query(collection(db, collections.venues));
    const unsub = onSnapshot(q, (snap) => {
      let total = 0, published = 0;
      snap.forEach((d) => {
        total++;
        if (d.data().published) published++;
      });
      setStats({ totalVenues: total, publishedVenues: published });
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Süper Admin</h1>
        <p className="text-sm text-slate-400 mt-1">Platform geneli özet</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <DarkStatCard icon={Building2} label="Toplam Mekan" value={stats.totalVenues} />
        <DarkStatCard icon={Building2} label="Yayında" value={stats.publishedVenues} />
        <DarkStatCard icon={Users} label="Taslak" value={stats.totalVenues - stats.publishedVenues} />
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-100">Hızlı Başlangıç</h3>
            <p className="text-sm text-slate-400 mt-1">QRMasa'yı test etmek için önce bir mekan oluştur.</p>
          </div>
          <Link to="/superadmin/mekanlar">
            <Button
              size="sm"
              icon={ArrowRight}
              iconPosition="right"
              className="bg-gradient-to-r from-orange-500 to-red-600"
            >
              Mekanlara Git
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function DarkStatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-orange-400" />
        </div>
      </div>
      <div className="text-2xl font-display font-bold text-slate-100">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
