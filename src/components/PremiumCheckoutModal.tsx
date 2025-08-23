import React, { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { Crown, CreditCard, QrCode, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { profilesService } from '@/services/profilesService';

interface PremiumCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Plan = 'monthly' | 'annual';
type Method = 'pix' | 'card';
type PixState = 'idle' | 'loading' | 'qrcode' | 'success' | 'error';

const PremiumCheckoutModal: React.FC<PremiumCheckoutModalProps> = ({ isOpen, onClose }) => {
  const [plan, setPlan] = useState<Plan>('annual');
  const [method, setMethod] = useState<Method>('pix');
  const [pixState, setPixState] = useState<PixState>('idle');
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [customer, setCustomer] = useState<{ full_name: string; email: string; phone: string; cpf: string }>({ full_name: '', email: '', phone: '', cpf: '' });
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  const { priceMonthly, priceAnnual, annualSavings } = useMemo(() => {
    const priceMonthly = 19.9;
    const priceAnnual = 12 * 19.9 * 0.83; // ~17% de economia (2 meses grátis aprox.)
    const annualSavings = 12 * 19.9 - priceAnnual;
    return { priceMonthly, priceAnnual, annualSavings };
  }, []);

  const currentPrice = plan === 'monthly' ? priceMonthly : priceAnnual;

  useEffect(() => {
    (async () => {
      const profile = await profilesService.getCurrent();
      // cpf pode vir de outra fonte no futuro (auth metadata/local). placeholder null por enquanto
      setCustomer({
        full_name: profile?.full_name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        cpf: '',
      });
    })();
  }, []);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  const onlyDigits = (v: string) => v.replace(/\D+/g, '');
  const isValidPhone = (v: string) => onlyDigits(v).length >= 10; // BR min 10-11
  const isValidCPF = (v: string) => onlyDigits(v).length === 11; // validação simples (tamanho)
  const isValidCustomer = () => {
    if (!customer.full_name || customer.full_name.trim().length < 3) { setValidationMsg('Informe seu nome completo.'); return false; }
    if (!isValidEmail(customer.email)) { setValidationMsg('Informe um email válido.'); return false; }
    if (!isValidPhone(customer.phone)) { setValidationMsg('Informe um telefone válido.'); return false; }
    if (!isValidCPF(customer.cpf)) { setValidationMsg('Informe um CPF válido (11 dígitos).'); return false; }
    setValidationMsg(null); return true;
  };

  const formatCPF = (v: string) => {
    const d = onlyDigits(v).slice(0, 11);
    const p1 = d.slice(0, 3);
    const p2 = d.slice(3, 6);
    const p3 = d.slice(6, 9);
    const p4 = d.slice(9, 11);
    let out = p1;
    if (p2) out += `.${p2}`;
    if (p3) out += `.${p3}`;
    if (p4) out += `-${p4}`;
    return out;
  };

  const handleGeneratePix = async () => {
    setPixState('loading');
    try {
      // Chamada à API Abacate Pay (placeholder). Substituir URL e auth.
      if (!isValidCustomer()) { setPixState('idle'); return; }
      const payload = {
        plan: plan,
        amount: Math.round(Number(currentPrice)),
        expiresIn: 1800,
        description: plan === 'annual' ? 'Finnko Premium Anual' : 'Finnko Premium Mensal',
        customer: {
          name: customer.full_name,
          cellphone: customer.phone,
          email: customer.email,
          taxId: customer.cpf,
        },
        metadata: { externalId: String(Date.now()) },
      };
      const resp = await fetch('/api/abacate/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || 'api_error');
      }
      if (!data || !data.qrcode || !data.copia_cola) throw new Error('invalid_response');
      setQrImage(data.qrcode as string); // base64 data URL esperado
      setPixCode(data.copia_cola as string);
      setPixState('qrcode');
    } catch {
      setPixState('error');
    }
  };

  const handleConfirmPaid = () => {
    setPixState('success');
  };

  const resetPix = () => {
    setPixState('idle');
    setPixCode(null);
  };

  // UI helpers
  const pillBtn = (active: boolean) => active
    ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-gray-900 shadow ring-1 ring-amber-300/60'
    : 'bg-gray-200 dark:bg-gray-700/70 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600';

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Seja Premium"
      zIndexClass="z-[200]"
      overlayClassName="bg-black/80 dark:bg-black/80"
      footer={
        pixState === 'success' ? (
          <button onClick={onClose} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Fechar</button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        {/* Planos */}
        <div>
          <p className="text-sm text-gray-400 mb-2">Escolha seu plano</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`rounded-xl p-3 text-sm font-semibold ${pillBtn(plan === 'monthly')}`}
              onClick={() => setPlan('monthly')}
            >
              Mensal <span className="block text-xs font-normal opacity-80">R$ {priceMonthly.toFixed(2)}/mês</span>
            </button>
            <button
              className={`rounded-xl p-3 text-sm font-semibold relative ${pillBtn(plan === 'annual')}`}
              onClick={() => setPlan('annual')}
            >
              Anual <span className="block text-xs font-normal opacity-80">R$ {priceAnnual.toFixed(2)}/ano</span>
              <span className="absolute -top-2 right-2 text-[10px] bg-amber-500 text-gray-900 font-bold px-1.5 py-0.5 rounded">Economize R$ {annualSavings.toFixed(0)}</span>
            </button>
          </div>
        </div>

        {/* Métodos */}
        <div>
          <p className="text-sm text-gray-400 mb-2">Forma de pagamento</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`rounded-xl p-3 text-sm font-semibold flex items-center justify-center gap-2 ${pillBtn(method === 'pix')}`}
              onClick={() => setMethod('pix')}
            >
              <QrCode size={16} /> PIX
            </button>
            <button
              className={`rounded-xl p-3 text-sm font-semibold flex items-center justify-center gap-2 ${pillBtn(method === 'card')}`}
              onClick={() => setMethod('card')}
            >
              <CreditCard size={16} /> Cartão
            </button>
          </div>
        </div>

        {/* PIX Flow */}
        {method === 'pix' && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
            {validationMsg && <p className="text-red-400 text-xs mb-3">{validationMsg}</p>}
            {/* Dados do cliente (visualização/edição mínima) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Nome completo</label>
                <input
                  value={customer.full_name}
                  onChange={e => setCustomer({ ...customer, full_name: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-md px-2 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={e => setCustomer({ ...customer, email: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-md px-2 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Telefone</label>
                <input
                  value={customer.phone}
                  onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-black/20 border border-white/10 rounded-md px-2 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">CPF</label>
                <input
                  value={formatCPF(customer.cpf)}
                  onChange={e => setCustomer({ ...customer, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="w-full bg-black/20 border border-white/10 rounded-md px-2 py-2 text-sm text-white"
                />
              </div>
            </div>
            {pixState === 'idle' && (
              <div className="text-center space-y-3">
                <p className="text-gray-300 text-sm">Geraremos um QR Code dinâmico para pagamento via Pix.</p>
                <button
                  onClick={handleGeneratePix}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-gray-900 font-semibold px-4 py-2 text-sm shadow-[0_6px_24px_rgba(255,199,0,0.35)] ring-1 ring-amber-300/60 hover:brightness-110 active:scale-[0.98] transition"
                >
                  Gerar QR Code
                </button>
              </div>
            )}
            {pixState === 'loading' && (
              <div className="flex items-center justify-center gap-2 py-6 text-gray-300">
                <Loader2 className="animate-spin" size={18} />
                <span>Gerando QR Code…</span>
              </div>
            )}
            {pixState === 'qrcode' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-300 text-sm"><Crown className="text-amber-300" size={16}/> Valor: <span className="font-semibold text-white">R$ {currentPrice.toFixed(2)}</span></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white p-2 aspect-square flex items-center justify-center">
                    {qrImage ? (
                      <img src={qrImage} alt="QR Code Pix" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-gray-500 text-xs">QR Code</div>
                    )}
                  </div>
                  <div className="flex flex-col text-gray-300 text-xs">
                    <span className="mb-1">Código Copia e Cola</span>
                    <textarea className="flex-1 bg-black/20 rounded p-2 text-[10px] text-gray-300" readOnly value={pixCode || ''} />
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => { try { navigator.clipboard.writeText(pixCode || ''); } catch {} }} className="bg-gray-700 hover:bg-gray-600 text-white rounded px-3 py-1 text-xs">Copiar</button>
                      <button onClick={handleConfirmPaid} className="bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1 text-xs">Já paguei</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {pixState === 'success' && (
              <div className="text-center space-y-2 py-4">
                <CheckCircle2 className="mx-auto text-green-500" size={28} />
                <p className="text-gray-100 font-semibold">Pagamento confirmado!</p>
                <p className="text-gray-400 text-sm">Seu Premium será ativado em instantes.</p>
              </div>
            )}
            {pixState === 'error' && (
              <div className="text-center space-y-3 py-4">
                <div className="flex items-center justify-center gap-2 text-red-400"><AlertCircle size={18}/>Falha ao gerar QR Code.</div>
                <button onClick={resetPix} className="bg-gray-700 hover:bg-gray-600 text-white rounded px-4 py-2 text-sm">Tentar novamente</button>
              </div>
            )}
          </div>
        )}

        {/* Cartão - placeholder para expansão futura */}
        {method === 'card' && (
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4 space-y-3 text-sm">
            <p className="text-gray-400">Pagamento com cartão em breve. Estrutura preparada para número, validade, CVV e parcelamento.</p>
            <div className="grid grid-cols-2 gap-2 opacity-60">
              <input className="bg-gray-900/60 rounded p-2" placeholder="Número do cartão" />
              <input className="bg-gray-900/60 rounded p-2" placeholder="Nome impresso" />
              <input className="bg-gray-900/60 rounded p-2" placeholder="Validade (MM/AA)" />
              <input className="bg-gray-900/60 rounded p-2" placeholder="CVV" />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PremiumCheckoutModal;


