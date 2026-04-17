import { Card } from '../../../components/ui/Card';
import { Sparkles } from 'lucide-react';

export function ComingSoonPage({ title, description, features }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>

      <Card className="bg-gradient-to-br from-slate-50 to-white">
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-sm mb-4">
            <Sparkles className="w-6 h-6 text-orange-500" />
          </div>
          <h3 className="font-display text-lg font-bold text-slate-900 mb-2">Yakında geliyor</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Bu modül üzerinde çalışılıyor. Aşağıdaki özellikler yakında hazır olacak.
          </p>
          {features && features.length > 0 && (
            <ul className="inline-block text-left text-sm text-slate-600 space-y-2">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
