import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Campos comuns
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Campos de cadastro
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState(''); // DD/MM/AAAA
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sex, setSex] = useState<'M' | 'F' | 'O' | ''>('');
  const [isBrazilian, setIsBrazilian] = useState<boolean>(true);
  const [financialGoal, setFinancialGoal] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helpers de máscara
  const formatBirthDate = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const p1 = digits.slice(0, 2);
    const p2 = digits.slice(2, 4);
    const p3 = digits.slice(4, 8);
    return [p1, p2, p3].filter(Boolean).join('/');
  };
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const ddd = digits.slice(0, 2);
    const part1 = digits.length > 2 ? digits.slice(2, digits.length === 11 ? 7 : 6) : '';
    const part2 = digits.length > 2 ? digits.slice(digits.length === 11 ? 7 : 6) : '';
    let out = '';
    if (ddd) out += `(${ddd}`;
    if (ddd && (part1 || part2)) out += ') ';
    if (part1) out += part1;
    if (part2) out += `-${part2}`;
    return out;
  };
  const parseBirthDateToISO = (br: string) => {
    const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const [_, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD
  };

  const handleSuccess = () => navigate('/app/resumo');

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md p-8 rounded-2xl border border-gray-200 shadow-sm text-gray-900">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{mode === 'login' ? 'Entrar no Finnko' : 'Criar conta'}</h1>
          <button
            className="text-sm text-[#19CF67] hover:underline"
            onClick={() => { setMode(prev => prev === 'login' ? 'signup' : 'login'); setErrorMsg(null); }}
          >
            {mode === 'login' ? 'Criar conta' : 'Já tenho uma conta'}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600">{mode === 'login' ? 'Use seu e-mail e senha para continuar.' : 'Preencha seus dados para começar.'}</p>

        {errorMsg && <div className="mt-3 text-sm text-red-600">{errorMsg}</div>}

        {mode === 'login' ? (
          <form className="mt-6 space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            try {
              setErrorMsg(null);
              await signIn(email, password);
              handleSuccess();
            } catch (err: any) {
              setErrorMsg(err?.message || 'Erro ao entrar.');
            }
          }}>
            <div>
              <label className="block text-sm text-gray-700 mb-1">E-mail</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#19CF67]"/>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Senha</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#19CF67]"/>
            </div>
            <button type="submit" className="w-full mt-2 px-4 py-2 rounded-lg text-white font-semibold bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454]">
              Entrar
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            try {
              setErrorMsg(null);
              if (password !== confirmPassword) {
                setErrorMsg('As senhas não conferem.');
                return;
              }
              // Sign up no Supabase Auth com user metadata
              await signUp(email, password, {
                full_name: fullName,
                birth_date: birthDate,
                phone,
                sex,
                is_brazilian: isBrazilian,
                financial_goal: financialGoal,
              });
              // Atualiza metadados (se necessário) e perfil
              const { data: userResp } = await supabase.auth.getUser();
              const uid = userResp.user?.id;
              if (uid) {
                // Salva metadados úteis (não crítico caso falhe)
                try {
                  await supabase.auth.updateUser({
                    data: {
                      full_name: fullName,
                      birth_date: birthDate,
                      phone,
                      sex,
                      is_brazilian: isBrazilian,
                      financial_goal: financialGoal,
                    }
                  });
                } catch {}
                // Garante perfil completo
                const isoBirth = parseBirthDateToISO(birthDate);
                await supabase.from('profiles').upsert({
                  user_id: uid,
                  email,
                  full_name: fullName,
                  phone,
                  birth_date: isoBirth,
                  avatar_url: null,
                  // Demais campos opcionais via coluna extras (se existirem no schema)
                  sex,
                  is_brazilian: isBrazilian,
                  financial_goal: financialGoal,
                } as any);
              }
              handleSuccess();
            } catch (err: any) {
              setErrorMsg(err?.message || 'Erro ao criar conta.');
            }
          }}>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Nome completo</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" required className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#19CF67]"/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Data de nascimento (DD/MM/AAAA)</label>
                <input value={birthDate} onChange={(e) => setBirthDate(formatBirthDate(e.target.value))} type="text" placeholder="00/00/0000" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#19CF67]"/>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Telefone</label>
                <input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} type="tel" placeholder="(00)00000-0000" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#19CF67]"/>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">E-mail</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#19CF67]"/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Senha</label>
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#19CF67]"/>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Confirmar senha</label>
                <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#19CF67]"/>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Sexo</label>
                <select value={sex} onChange={(e) => setSex(e.target.value as any)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#19CF67]">
                  <option value="">Selecione</option>
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                  <option value="O">Outro</option>
                </select>
              </div>
              <div className="flex items-center justify-between mt-6 sm:mt-0">
                <label className="text-sm text-gray-700">Você é brasileiro?</label>
                <input type="checkbox" checked={isBrazilian} onChange={(e) => setIsBrazilian(e.target.checked)} className="h-5 w-5"/>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Objetivo financeiro</label>
              <select value={financialGoal} onChange={(e) => setFinancialGoal(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#19CF67]">
                <option value="">Selecione</option>
                <option>Quero sair das dívidas e ter paz financeira</option>
                <option>Quero descobrir para onde meu dinheiro vai</option>
                <option>Quero organizar minhas finanças sem complicação</option>
                <option>Quero fazer sobrar mais dinheiro todo mês</option>
                <option>Quero começar a investir e ver meu dinheiro crescer</option>
                <option>Quero realizar um objetivo específico (viagem, carro, casa, etc.)</option>
              </select>
            </div>
            <button type="submit" className="w-full mt-2 px-4 py-2 rounded-lg text-white font-semibold bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454]">
              Criar conta
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthPage;


