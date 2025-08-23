import React, { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import ImageCropModal from '@/components/ImageCropModal';
import { profilesService, type Profile, type EmploymentType } from '@/services/profilesService';
import { supabase } from '@/lib/supabaseClient';
import { useAppContext } from '@/context/AppContext';
import { Crown, CheckCircle2, ChevronRight, CalendarDays, User2, Gift, LogOut } from 'lucide-react';
import PremiumCheckoutModal from '@/components/PremiumCheckoutModal';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMPLOYMENT_OPTIONS: EmploymentType[] = ['CLT', 'PJ', 'Autônomo', 'Estudante', 'Servidor público', 'Aposentado', 'Desempregado'];

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const { showToast, setProfilePicture, setConfirmation, modalState, setModalState } = useAppContext() as any;
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  const [form, setForm] = useState<Profile>({
    user_id: '',
    email: null,
    full_name: null,
    phone: null,
    employment_type: null,
    financial_goal: null,
    avatar_url: null,
  });

  const [original, setOriginal] = useState<Profile | null>(null);
  const [touched, setTouched] = useState<{ email?: boolean; phone?: boolean; full_name?: boolean }>({});

  const handleLockedFieldNotice = (label: string) => {
    try {
      showToast && showToast(`${label} não pode ser alterado por enquanto.`, 'info');
    } catch {}
  };

  const openPremiumModal = () => {
    try {
      setModalState({ modal: 'premium-checkout', data: null });
    } catch {}
  };

  const attemptClose = () => {
    if (isDirty) {
      try {
        setConfirmation({
          title: 'Alterações não salvas',
          message: 'Você fez mudanças no seu perfil. Deseja sair sem salvar?',
          buttons: [
            { label: 'Continuar editando', style: 'secondary', onClick: () => setConfirmation(null) },
            { label: 'Descartar alterações', style: 'danger', onClick: () => { setConfirmation(null); onClose(); } },
          ],
        });
      } catch {
        onClose();
      }
      return;
    }
    onClose();
  };

  const isValidEmail = (value: string | null) => {
    if (!value) return true;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    return re.test(value.trim());
  };
  const normalizePhone = (input: string) => input.replace(/[^\d+]/g, '');
  const isValidPhone = (value: string | null) => {
    if (!value || value.trim() === '') return true;
    const v = normalizePhone(value);
    return /^\+?\d{8,15}$/.test(v);
  };
  const hasErrors = useMemo(() => !isValidEmail(form.email) || !isValidPhone(form.phone), [form.email, form.phone]);
  const isDirty = useMemo(() => {
    if (!original) return false;
    const keys: (keyof Profile)[] = ['email','full_name','phone','employment_type','financial_goal','avatar_url'];
    return keys.some(k => (original[k] ?? '') !== (form[k] ?? ''));
  }, [original, form]);

  useEffect(() => {
    if (!isOpen || initialLoaded) return;
    (async () => {
      // 1) Lê perfil salvo (supabase/local)
      const current = await profilesService.getCurrent();
      let base = current || form;
      // 2) Puxa dados do cadastro do usuário (Supabase Auth)
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user as any;
        const meta = user?.user_metadata || {};
        base = {
          user_id: user?.id ?? base.user_id,
          email: user?.email ?? base.email,
          full_name: meta.full_name ?? base.full_name,
          phone: meta.phone ?? base.phone,
          employment_type: meta.employment_type ?? base.employment_type,
          financial_goal: meta.financial_goal ?? base.financial_goal,
          avatar_url: base.avatar_url ?? null,
        } as Profile;
        setCreatedAt(user?.created_at ?? null);
      } catch {}
      setForm(base);
      setOriginal(base);
      setInitialLoaded(true);
    })();
  }, [isOpen, initialLoaded]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageToCrop(String(ev.target?.result || ''));
    reader.readAsDataURL(file);
  };

  const handleCropped = async (base64: string) => {
    setImageToCrop(null);
    const uploadedUrl = await profilesService.uploadAvatar(base64);
    const finalUrl = uploadedUrl || base64;
    setForm(prev => ({ ...prev, avatar_url: finalUrl }));
    try { setProfilePicture && setProfilePicture(finalUrl); } catch {}
  };

  const save = async () => {
    // Confirmação quando houver mudança em dados cadastrais (email, telefone, nome)
    const sensitiveChanged = !!original && (
      (original.email ?? '') !== (form.email ?? '') ||
      (original.phone ?? '') !== (form.phone ?? '') ||
      (original.full_name ?? '') !== (form.full_name ?? '')
    );
    if (sensitiveChanged) {
      const proceed = await new Promise<boolean>((resolve) => {
        try {
          setConfirmation({
            title: 'Confirmar alteração de dados cadastrais',
            message: 'Você está alterando informações que vêm do cadastro (nome, email ou telefone). Tem certeza que deseja continuar?',
            buttons: [
              { label: 'Cancelar', style: 'secondary', onClick: () => { setConfirmation(null); resolve(false); } },
              { label: 'Confirmar e salvar', style: 'primary', onClick: () => { setConfirmation(null); resolve(true); } },
            ],
          });
        } catch { resolve(true); }
      });
      if (!proceed) return;
    }
    try {
      setLoading(true);
      const saved = await profilesService.upsert(form);
      // Atualiza dados no Auth: metadados + campos sensíveis quando mudarem
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: saved.full_name ?? undefined,
            phone: saved.phone ?? undefined,
            employment_type: saved.employment_type ?? undefined,
            financial_goal: saved.financial_goal ?? undefined,
          },
        });
        // Email alterado
        if ((original?.email ?? '') !== (form.email ?? '') && form.email) {
          const { error: emailErr } = await supabase.auth.updateUser({ email: form.email });
          if (emailErr) {
            try { showToast && showToast('Mudança de email registrada no perfil. Configure SMTP no Supabase para enviar o link de confirmação.', 'info'); } catch {}
          } else {
            try { showToast && showToast('Enviamos um link de confirmação para o novo email. Se não chegar, verifique a configuração de SMTP.', 'info'); } catch {}
          }
        }
        // Telefone alterado
        if ((original?.phone ?? '') !== (form.phone ?? '') && form.phone) {
          const { error: phoneErr } = await supabase.auth.updateUser({ phone: normalizePhone(form.phone) });
          if (phoneErr) {
            try { showToast && showToast('Telefone atualizado no perfil. Para SMS de verificação, configure SMS (ex.: Twilio) no Supabase.', 'info'); } catch {}
          } else {
            try { showToast && showToast('Se SMS estiver configurado, enviaremos um código de verificação.', 'info'); } catch {}
          }
        }
      } catch {}
      try { showToast && showToast('Perfil atualizado!', 'success'); } catch {}
      setOriginal(saved);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={attemptClose}
        title="Meu Perfil"
        footer={
          <>
            <button onClick={attemptClose} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
            {isDirty && (
              <button onClick={save} disabled={loading || hasErrors || !isDirty} className={`bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg ${(loading || hasErrors || !isDirty) ? 'opacity-70 cursor-not-allowed' : ''}`}>{loading ? 'Salvando...' : 'Salvar'}</button>
            )}
          </>
        }
      >
        <div className="space-y-6">
          {/* Header compacto */}
          <div className="flex items-center gap-4 pb-6">
            <div className="relative shrink-0 h-20 w-20">
              <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center ring-1 ring-white/10">
                {(avatarPreview || form.avatar_url) ? (
                  <img src={avatarPreview || form.avatar_url || ''} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-500 text-xs">Sem foto</span>
                )}
              </div>
              <label className="absolute top-full left-1/2 -translate-x-1/2 translate-y-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-900 dark:text-white px-3 py-1 rounded-full cursor-pointer text-[12px] font-normal shadow-sm whitespace-nowrap">
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                Mudar foto
              </label>
            </div>
            <div className="min-w-0 self-center flex flex-col justify-center">
              <div className="text-xl md:text-2xl font-semibold text-white leading-tight tracking-tight">{form.full_name || 'Seu nome'}</div>
              <div className="text-sm text-gray-400 truncate mt-0">{form.email || '-'}</div>
            </div>
          </div>
          {/* Botão Remover retirado para manter foco em ação única */}

          {/* Card de status e data de cadastro */}
          <div className="flex items-center justify-between rounded-xl border border-gray-600/40 bg-gray-800/60 px-4 py-3">
            <div className="flex items-center gap-2 text-gray-200">
              <div className="inline-flex items-center justify-center rounded-full bg-amber-500/10 text-amber-300 ring-1 ring-amber-300/40 p-1.5">
                <Crown size={18} />
              </div>
              <div className="text-sm"><span className="text-gray-400">Situação:</span> <span className="font-medium text-gray-100">Free</span></div>
            </div>
            {createdAt && (
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CalendarDays size={16} className="text-gray-400" />
                <span>Cadastrado em: {new Date(createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
          </div>

          {/* Banner Premium */
          }
          <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-zinc-900/60 via-slate-900/60 to-zinc-900/60 p-6 shadow-lg">
            <div className="pointer-events-none absolute -top-20 -right-24 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="flex flex-col items-center text-center gap-4">
              <div className="inline-flex items-center justify-center rounded-full bg-amber-500/10 text-amber-300 ring-1 ring-amber-300/40 p-2">
                <Crown size={24} strokeWidth={1.75} />
              </div>
              <p className="text-[15px] leading-relaxed text-gray-100 max-w-xl">
                Assine o <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-400 font-semibold">Premium</span> e aproveite 100% das funcionalidades do Finnko.
              </p>
              <div className="w-full flex justify-center">
                <button
                  onClick={openPremiumModal}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-gray-900 font-semibold px-3.5 py-1.5 text-sm shadow-[0_6px_24px_rgba(255,199,0,0.35)] ring-1 ring-amber-300/60 hover:from-amber-300 hover:to-yellow-500 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 active:scale-[0.98] transition"
                >
                  Conhecer benefícios
                  <ChevronRight size={18} className="ml-1.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Lista de ações */}
          <div className="rounded-xl overflow-hidden border border-gray-700/40 divide-y divide-gray-700/40 bg-gray-800/50">
            <button onClick={() => setShowForm(v => !v)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/70 transition">
              <div className="flex items-center gap-3">
                <User2 className="text-gray-300" size={18} />
                <span className="text-gray-100 text-sm">Meu cadastro</span>
              </div>
              <ChevronRight size={18} className={`text-gray-400 transition-transform ${showForm ? 'rotate-90' : ''}`} />
            </button>
            <button onClick={openPremiumModal} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/70 transition">
              <div className="flex items-center gap-3">
                <Crown className="text-amber-300" size={18} />
                <span className="text-gray-100 text-sm">Finnko Premium</span>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
            <button onClick={() => { try { showToast && showToast('Programa de indicações em breve!', 'info'); } catch {} }} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/70 transition">
              <div className="flex items-center gap-3">
                <Gift className="text-gray-300" size={18} />
                <span className="text-gray-100 text-sm">Convidou, ganhou!</span>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
            <button onClick={async () => { try { await supabase.auth.signOut(); showToast && showToast('Você saiu da conta.', 'info'); } catch {}; onClose(); }} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/70 transition">
              <div className="flex items-center gap-3">
                <LogOut className="text-gray-300" size={18} />
                <span className="text-gray-100 text-sm">Sair</span>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          </div>
          {modalState?.modal === 'premium-checkout' && (
            <PremiumCheckoutModal isOpen={true} onClose={() => setModalState({ modal: null, data: null })} />
          )}

          {/* Acordeão: Meu cadastro */}
          <div className={`overflow-hidden transition-all ${showForm ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                <input value={form.full_name ?? ''} onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))} onBlur={() => setTouched(t => ({ ...t, full_name: true }))} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input 
                  type="email"
                  value={form.email ?? ''}
                  readOnly
                  onClick={() => handleLockedFieldNotice('Email')}
                  onFocus={(e) => { e.currentTarget.blur(); handleLockedFieldNotice('Email'); }}
                  className={`w-full cursor-not-allowed opacity-80 bg-gray-100 dark:bg-gray-700 border ${touched.email && !isValidEmail(form.email) ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg px-3 py-2 text-gray-900 dark:text-white`} 
                />
                {touched.email && !isValidEmail(form.email) && (
                  <p className="mt-1 text-xs text-red-500">Email inválido.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                <input 
                  value={form.phone ?? ''} 
                  readOnly 
                  onClick={() => handleLockedFieldNotice('Telefone')} 
                  onFocus={(e) => { e.currentTarget.blur(); handleLockedFieldNotice('Telefone'); }} 
                  placeholder="+55 11999999999" 
                  className={`w-full cursor-not-allowed opacity-80 bg-gray-100 dark:bg-gray-700 border ${touched.phone && !isValidPhone(form.phone) ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg px-3 py-2 text-gray-900 dark:text-white`} 
                />
                {touched.phone && !isValidPhone(form.phone) && (
                  <p className="mt-1 text-xs text-red-500">Telefone inválido. Use formato internacional (ex.: +5511999999999).</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de emprego</label>
                <select value={form.employment_type ?? ''} onChange={(e) => setForm(prev => ({ ...prev, employment_type: (e.target.value || null) as EmploymentType | null }))} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Selecione...</option>
                  {EMPLOYMENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objetivo financeiro</label>
                <input value={form.financial_goal ?? ''} onChange={(e) => setForm(prev => ({ ...prev, financial_goal: e.target.value }))} placeholder="Reserva, viagem, quitar dívidas..." className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {imageToCrop && (
        <ImageCropModal imageSrc={imageToCrop} onClose={() => { setImageToCrop(null); setAvatarPreview(null); }} onSave={handleCropped} onPreview={(img) => setAvatarPreview(img)} />
      )}
    </>
  );
};

export default ProfileModal;


