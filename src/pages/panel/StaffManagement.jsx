import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadManagerSetup } from '../../utils/managerDraft';
import {
  clearStaffDraft,
  createStaffId,
  loadStaffDraft,
  PERMISSION_DEFINITIONS,
  permissionsForRole,
  ROLE_DEFINITIONS,
  saveStaffDraft,
} from '../../utils/staffDraft';

function blankMember(role = 'waiter') {
  return {
    id: '',
    name: '',
    email: '',
    phone: '',
    role,
    active: true,
    locked: false,
    permissions: permissionsForRole(role),
  };
}

function roleLabel(role) {
  if (role === 'owner') return 'İşletme sahibi';
  return ROLE_DEFINITIONS.find((item) => item.value === role)?.label || role;
}

function permissionCount(member) {
  return Object.values(member.permissions || {}).filter(Boolean).length;
}

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
    .join('');
}

export default function StaffManagement() {
  const navigate = useNavigate();
  const setup = useMemo(() => loadManagerSetup(), []);
  const businessCode = setup.business.code;
  const [draft, setDraft] = useState(() => loadStaffDraft(businessCode, setup.owner));
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState(() => blankMember());
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const visibleMembers = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('tr-TR');
    return draft.members
      .filter((member) => roleFilter === 'all' || member.role === roleFilter)
      .filter((member) => statusFilter === 'all' || (statusFilter === 'active' ? member.active : !member.active))
      .filter((member) => !needle || `${member.name} ${member.email} ${member.phone}`.toLocaleLowerCase('tr-TR').includes(needle))
      .sort((a, b) => {
        if (a.locked !== b.locked) return a.locked ? -1 : 1;
        return a.name.localeCompare(b.name, 'tr');
      });
  }, [draft.members, roleFilter, search, statusFilter]);

  const activeCount = draft.members.filter((member) => member.active).length;
  const waiterCount = draft.members.filter((member) => member.role === 'waiter' && member.active).length;
  const kitchenCount = draft.members.filter((member) => member.role === 'kitchen' && member.active).length;

  function persist(nextDraft, message = 'Değişiklikler kaydedildi.') {
    const saved = saveStaffDraft(businessCode, nextDraft);
    setDraft(saved);
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2200);
  }

  function openNewMember() {
    setForm(blankMember());
    setError('');
    setModalOpen(true);
  }

  function openEditMember(member) {
    if (member.locked) return;
    setForm({ ...member, permissions: { ...member.permissions } });
    setError('');
    setModalOpen(true);
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function changeRole(role) {
    setForm((current) => ({
      ...current,
      role,
      permissions: permissionsForRole(role),
    }));
  }

  function togglePermission(key) {
    setForm((current) => ({
      ...current,
      permissions: {
        ...current.permissions,
        [key]: !current.permissions[key],
      },
    }));
  }

  function submitMember(event) {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLocaleLowerCase('tr-TR');
    const phone = form.phone.trim();

    if (!name) {
      setError('Personelin adını ve soyadını yazın.');
      return;
    }
    if (email && !email.includes('@')) {
      setError('Geçerli bir e-posta adresi yazın veya alanı boş bırakın.');
      return;
    }
    if (!ROLE_DEFINITIONS.some((role) => role.value === form.role)) {
      setError('Geçerli bir görev seçin.');
      return;
    }

    const duplicateEmail = email && draft.members.some(
      (member) => member.id !== form.id && member.email?.toLocaleLowerCase('tr-TR') === email,
    );
    if (duplicateEmail) {
      setError('Bu e-posta adresi başka bir personelde kayıtlı.');
      return;
    }

    const member = {
      ...form,
      id: form.id || createStaffId(),
      name,
      email,
      phone,
      createdAt: form.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    const members = form.id
      ? draft.members.map((item) => (item.id === form.id ? member : item))
      : [...draft.members, member];

    persist({ ...draft, members }, form.id ? 'Personel bilgileri güncellendi.' : 'Personel taslağa eklendi.');
    setModalOpen(false);
    setForm(blankMember());
    setError('');
  }

  function toggleMemberActive(member) {
    if (member.locked) return;
    persist({
      ...draft,
      members: draft.members.map((item) => (
        item.id === member.id ? { ...item, active: !item.active, updatedAt: Date.now() } : item
      )),
    }, member.active ? 'Personel pasife alındı.' : 'Personel yeniden aktifleştirildi.');
  }

  function deleteMember(member) {
    if (member.locked) return;
    if (!window.confirm(`“${member.name}” personel listesinden silinsin mi?`)) return;
    persist({ ...draft, members: draft.members.filter((item) => item.id !== member.id) }, 'Personel silindi.');
  }

  function resetDraft() {
    if (!window.confirm('Bu işletmenin personel ve yetki taslağı sıfırlansın mı?')) return;
    clearStaffDraft(businessCode);
    setDraft(loadStaffDraft(businessCode, setup.owner));
    setNotice('Personel taslağı sıfırlandı.');
  }

  if (!setup.completed || !businessCode) {
    return (
      <div className="min-h-screen bg-neutral-950 p-6 text-white grid place-items-center">
        <div className="w-full max-w-lg rounded-3xl border border-amber-400/20 bg-neutral-900 p-7 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="mt-4 text-2xl font-black">Önce işletme kurulumunu tamamlayın</h1>
          <p className="mt-2 text-sm text-neutral-400">Personel taslağı işletme koduna bağlı olarak saklanır.</p>
          <button onClick={() => navigate('/panel/yonetici')} className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 font-bold">
            Yönetici kurulumuna dön
          </button>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full rounded-2xl border border-white/10 bg-neutral-800 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-emerald-500';
  const groupedPermissions = PERMISSION_DEFINITIONS.reduce((groups, permission) => {
    groups[permission.group] ||= [];
    groups[permission.group].push(permission);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-900/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">QRMASA Personel Yönetimi</p>
            <h1 className="mt-1 text-2xl font-black">{setup.business.name}</h1>
            <p className="mt-1 text-sm text-neutral-400">Görev, erişim ve operasyon yetkileri</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/panel/yonetici')} className="rounded-xl bg-neutral-800 px-4 py-2 text-sm font-bold">Yönetim ana sayfası</button>
            <button onClick={openNewMember} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold">+ Personel ekle</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 py-7">
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Toplam personel', draft.members.length, '👥'],
            ['Aktif hesap', activeCount, '✓'],
            ['Garson', waiterCount, '🧑‍💼'],
            ['Mutfak', kitchenCount, '👨‍🍳'],
          ].map(([label, value, icon]) => (
            <article key={label} className="rounded-3xl border border-white/10 bg-neutral-900 p-5">
              <div className="text-2xl">{icon}</div>
              <p className="mt-3 text-sm text-neutral-400">{label}</p>
              <strong className="mt-1 block text-3xl">{value}</strong>
            </article>
          ))}
        </section>

        <section className="mb-6 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100/80">
          Bu ekran geliştirme taslağıdır. Eklenen personel için henüz gerçek hesap veya davet oluşturulmaz. Firebase Authentication ve sunucu tarafı yetkilendirme bütün yönetim modülleri tamamlandıktan sonra bağlanacaktır.
        </section>

        {notice && <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">{notice}</div>}
        {error && !modalOpen && <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        <section className="rounded-3xl border border-white/10 bg-neutral-900 p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Personel listesi</p>
              <h2 className="mt-1 text-xl font-black">Görev ve erişimler</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Personel ara" className="rounded-xl border border-white/10 bg-neutral-800 px-4 py-2 text-sm outline-none focus:border-emerald-500" />
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-xl border border-white/10 bg-neutral-800 px-4 py-2 text-sm outline-none">
                <option value="all">Tüm görevler</option>
                <option value="owner">İşletme sahibi</option>
                {ROLE_DEFINITIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-white/10 bg-neutral-800 px-4 py-2 text-sm outline-none">
                <option value="all">Tüm durumlar</option>
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
              </select>
            </div>
          </div>

          {visibleMembers.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-neutral-950/40 p-12 text-center">
              <div className="text-5xl">👥</div>
              <h3 className="mt-4 text-xl font-bold">Personel bulunamadı</h3>
              <p className="mt-2 text-sm text-neutral-400">Filtreleri temizleyin veya yeni personel ekleyin.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {visibleMembers.map((member) => (
                <article key={member.id} className={`rounded-3xl border p-5 ${member.active ? 'border-white/10 bg-neutral-800/70' : 'border-white/5 bg-neutral-900 opacity-70'}`}>
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 font-black text-emerald-300">{initials(member.name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-bold">{member.name}</h3>
                          <p className="mt-1 text-sm text-emerald-400">{roleLabel(member.role)}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${member.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-neutral-700 text-neutral-400'}`}>{member.active ? 'Aktif' : 'Pasif'}</span>
                      </div>
                      {member.email && <p className="mt-3 truncate text-sm text-neutral-400">{member.email}</p>}
                      {member.phone && <p className="mt-1 text-sm text-neutral-500">{member.phone}</p>}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-2xl bg-neutral-900/70 p-3 text-sm">
                    <span className="text-neutral-400">Tanımlı yetki</span>
                    <strong>{permissionCount(member)} / {PERMISSION_DEFINITIONS.length}</strong>
                  </div>

                  {member.locked ? (
                    <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 p-3 text-center text-xs text-emerald-200">İşletme sahibi kaydı kurulum ekranından yönetilir.</div>
                  ) : (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button onClick={() => openEditMember(member)} className="rounded-xl bg-neutral-700 py-2 text-sm font-semibold">Düzenle</button>
                      <button onClick={() => toggleMemberActive(member)} className="rounded-xl bg-neutral-700 py-2 text-sm font-semibold">{member.active ? 'Pasife al' : 'Aktifleştir'}</button>
                      <button onClick={() => deleteMember(member)} className="rounded-xl bg-red-500/10 py-2 text-sm font-semibold text-red-200">Sil</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 flex justify-end">
          <button onClick={resetDraft} className="rounded-xl border border-red-400/20 bg-red-400/10 px-5 py-3 text-sm font-semibold text-red-200">Personel taslağını sıfırla</button>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setModalOpen(false)}>
          <form onSubmit={submitMember} className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-neutral-900" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Personel kaydı</p>
                <h2 className="mt-1 text-xl font-black">{form.id ? 'Personeli düzenle' : 'Yeni personel ekle'}</h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="h-10 w-10 rounded-full bg-neutral-800 text-xl">×</button>
            </header>

            <div className="space-y-6 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold">Ad soyad</span>
                  <input value={form.name} onChange={(event) => updateField('name', event.target.value)} className={`${inputClass} mt-2`} placeholder="Personelin adı ve soyadı" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">E-posta <span className="text-neutral-500">— isteğe bağlı</span></span>
                  <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className={`${inputClass} mt-2`} placeholder="personel@isletme.com" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">Telefon <span className="text-neutral-500">— isteğe bağlı</span></span>
                  <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} className={`${inputClass} mt-2`} placeholder="05xx xxx xx xx" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold">Görev</span>
                  <select value={form.role} onChange={(event) => changeRole(event.target.value)} className={`${inputClass} mt-2`}>
                    {ROLE_DEFINITIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                  <p className="mt-2 text-xs text-neutral-500">{ROLE_DEFINITIONS.find((role) => role.value === form.role)?.description}</p>
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">Görev yetkileri</p>
                    <p className="mt-1 text-xs text-neutral-500">Göreve göre önerilen yetkiler otomatik seçilir; gerektiğinde tek tek değiştirilebilir.</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">{permissionCount(form)} yetki</span>
                </div>

                <div className="mt-4 space-y-4">
                  {Object.entries(groupedPermissions).map(([group, permissions]) => (
                    <section key={group} className="rounded-2xl border border-white/10 bg-neutral-800/70 p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">{group}</h3>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {permissions.map((permission) => (
                          <button key={permission.key} type="button" onClick={() => togglePermission(permission.key)} className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm ${form.permissions[permission.key] ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/5 bg-neutral-900 text-neutral-400'}`}>
                            <span>{permission.label}</span>
                            <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${form.permissions[permission.key] ? 'bg-emerald-500 text-white' : 'bg-neutral-700'}`}>{form.permissions[permission.key] ? '✓' : '—'}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>

              <button type="button" onClick={() => updateField('active', !form.active)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-neutral-800 p-4 text-left">
                <span>
                  <strong className="block text-sm">Personel aktif</strong>
                  <span className="mt-1 block text-xs text-neutral-500">Pasif personel uygulamaya giriş yapamaz.</span>
                </span>
                <span className={`relative h-7 w-12 rounded-full ${form.active ? 'bg-emerald-500' : 'bg-neutral-600'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${form.active ? 'left-6' : 'left-1'}`} /></span>
              </button>

              {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-white/10 p-5">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold">Vazgeç</button>
              <button className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold">{form.id ? 'Değişiklikleri kaydet' : 'Personeli ekle'}</button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
