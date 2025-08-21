import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSuccess = () => navigate('/app/resumo');

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md p-8 rounded-2xl border border-gray-200 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Entrar no Finnko</h1>
        <p className="mt-2 text-sm text-gray-600">Use seu e-mail e senha para continuar.</p>

        <form className="mt-6 space-y-4" onSubmit={async (e) => { e.preventDefault(); await signIn(email, password); handleSuccess(); }}>
          <div>
            <label className="block text-sm text-gray-700 mb-1">E-mail</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#19CF67]"/>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Senha</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#19CF67]"/>
          </div>
          <button type="submit" className="w-full mt-2 px-4 py-2 rounded-lg text-white font-semibold bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454]">
            Entrar
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={async () => { await signUp(email || 'user@example.com', password || 'senha12345'); handleSuccess(); }} className="text-sm text-[#19CF67] hover:underline">Criar conta</button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;


