import React, { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import ImageCropModal from '@/components/ImageCropModal';
import { profilesService, type Profile, type EmploymentType } from '@/services/profilesService';
import { supabase } from '@/lib/supabaseClient';
import { useAppContext } from '@/context/AppContext';

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
  const { showToast, setProfilePicture, setConfirmation } = useAppContext() as any;

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
        onClose={onClose}
        title="Meu Perfil"
        footer={
          <>
            <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
            <button onClick={save} disabled={loading || hasErrors || !isDirty} className={`bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg ${(loading || hasErrors || !isDirty) ? 'opacity-70 cursor-not-allowed' : ''}`}>{loading ? 'Salvando...' : 'Salvar'}</button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
              {(avatarPreview || form.avatar_url) ? (
                <img src={avatarPreview || form.avatar_url || ''} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-500 text-xs">Sem foto</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <label className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-3 py-2 rounded-lg cursor-pointer">
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                Mudar foto
              </label>
              {form.avatar_url && (
                <button onClick={() => setForm(prev => ({ ...prev, avatar_url: null }))} className="text-sm text-red-600 dark:text-red-400 hover:underline">Remover</button>
              )}
            </div>
          </div>

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
            {/* aviso removido conforme pedido */}
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
            {/* aviso removido conforme pedido */}
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
      </Modal>

      {imageToCrop && (
        <ImageCropModal imageSrc={imageToCrop} onClose={() => { setImageToCrop(null); setAvatarPreview(null); }} onSave={handleCropped} onPreview={(img) => setAvatarPreview(img)} />
      )}
    </>
  );
};

export default ProfileModal;


