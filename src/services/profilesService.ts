import { supabase } from '@/lib/supabaseClient';

export type EmploymentType = 'CLT' | 'PJ' | 'Autônomo' | 'Estudante' | 'Servidor público' | 'Aposentado' | 'Desempregado';

export interface Profile {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  employment_type: EmploymentType | null;
  financial_goal: string | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
}

function b64toBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

export const profilesService = {
  async getCurrent(): Promise<Profile | null> {
    try {
      const { data: auth } = await supabase.auth.getSession();
      const user = auth.session?.user || null;
      if (!user) {
        const local = window.localStorage.getItem('profile');
        return local ? (JSON.parse(local) as Profile) : null;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, phone, employment_type, financial_goal, avatar_url, created_at, updated_at')
        .eq('user_id', user.id)
        .single();
      if (error && (error as any).code !== 'PGRST116') throw error; // not found is ok
      if (data) return data as Profile;
      // fallback: seed basic data from auth user
      return {
        user_id: user.id,
        email: user.email ?? null,
        full_name: user.user_metadata?.full_name ?? null,
        phone: user.user_metadata?.phone ?? null,
        employment_type: (user.user_metadata?.employment_type as EmploymentType) ?? null,
        financial_goal: user.user_metadata?.financial_goal ?? null,
        avatar_url: null,
      } as Profile;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('profilesService.getCurrent error:', e);
      try {
        const local = window.localStorage.getItem('profile');
        return local ? (JSON.parse(local) as Profile) : null;
      } catch {
        return null;
      }
    }
  },

  async upsert(profile: Profile): Promise<Profile> {
    try {
      const { data: auth } = await supabase.auth.getSession();
      const user = auth.session?.user || null;
      if (!user) {
        window.localStorage.setItem('profile', JSON.stringify(profile));
        return profile;
      }
      const payload = {
        user_id: user.id,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        employment_type: profile.employment_type,
        financial_goal: profile.financial_goal,
        avatar_url: profile.avatar_url,
      } as any;
      const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' }).select('*').single();
      if (error) throw error;
      return data as Profile;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('profilesService.upsert error:', e);
      window.localStorage.setItem('profile', JSON.stringify(profile));
      return profile;
    }
  },

  async uploadAvatar(base64Image: string): Promise<string | null> {
    try {
      const { data: auth } = await supabase.auth.getSession();
      const user = auth.session?.user || null;
      if (!user) {
        // armazenar localmente como data URL
        window.localStorage.setItem('profile:avatar', base64Image);
        return base64Image;
      }
      const blob = b64toBlob(base64Image);
      const filePath = `${user.id}.jpg`;
      // tenta remover versão antiga (não bloquear)
      try { await supabase.storage.from('avatars').remove([filePath]); } catch {}
      const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, blob, { upsert: true, contentType: blob.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl || null;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('profilesService.uploadAvatar error:', e);
      return null;
    }
  },
};


