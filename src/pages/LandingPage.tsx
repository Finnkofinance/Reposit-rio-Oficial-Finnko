import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Import da imagem do hero (salve a imagem anexada como src/assets/hero-landing.jpg)
// Vite cuidará do asset bundling
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import heroImg from '@/assets/hero-landing.jpg';
import { useNavigate } from 'react-router-dom';

const Logo: React.FC = () => (
  <div className="flex items-center space-x-2">
    <div className="w-6 h-6 rounded-md bg-gradient-to-r from-[#19CF67] to-[#00DE5F]" />
    <span className="font-extrabold tracking-tight text-gray-900">Finnko</span>
  </div>
);

const LandingNavbar: React.FC = () => {
  const navigate = useNavigate();
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Logo />
        <div className="hidden md:flex items-center space-x-6 text-sm text-gray-600">
          <button onClick={() => scrollTo('features')} className="hover:text-gray-900">Funcionalidades</button>
          <button onClick={() => scrollTo('testimonials')} className="hover:text-gray-900">Depoimentos</button>
          <button onClick={() => scrollTo('pricing')} className="hover:text-gray-900">Preços</button>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate('/auth')} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">Login</button>
          <button onClick={() => navigate('/auth')} className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454] shadow">
            Começar grátis
          </button>
          <button
            onClick={() => { try { window.localStorage.setItem('demo:allow', 'true'); } catch {}; navigate('/app/resumo'); }}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50"
            title="Entrar em modo demonstração (sem login)"
          >
            Modo Demo
          </button>
        </div>
      </nav>
    </div>
  );
};

const Hero: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Bem-vindo ao Finnko</p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900 leading-tight">
              Organize suas finanças com clareza <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#19CF67] to-[#00DE5F]">em minutos</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-gray-600 max-w-xl">
              Planeje orçamentos, acompanhe gastos, cartões e investimentos em um só lugar. Experiência fluida, visual moderno e foco em resultados.
            </p>
            <div className="mt-7 flex items-center space-x-3">
              <button onClick={() => navigate('/auth')} className="px-5 py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454] shadow-lg">
                Começar grátis
              </button>
              <a href="#features" className="px-5 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">Ver recursos</a>
            </div>
            <div className="mt-6 text-sm text-gray-500">+200k usuários • Nota 4.9/5</div>
          </div>
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative">
              <div className="rounded-2xl overflow-hidden ring-1 ring-gray-200 shadow-2xl">
                <img
                  src={heroImg}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=1600&auto=format&fit=crop'; }}
                  alt="Hero"
                  className="w-full h-[320px] md:h-[420px] object-cover"
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

const SectionTitle: React.FC<{ id?: string; title: string; subtitle?: string; }> = ({ id, title, subtitle }) => (
  <div id={id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
    {subtitle && <p className="mt-2 text-gray-600 max-w-2xl">{subtitle}</p>}
  </div>
);

const Placeholder: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
      Conteúdo em breve
    </div>
  </div>
);

const Footer: React.FC = () => (
  <footer className="mt-20 border-t border-gray-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center md:justify-between text-sm text-gray-500">
      <Logo />
      <div className="mt-3 md:mt-0">© {new Date().getFullYear()} Finnko. Todos os direitos reservados.</div>
    </div>
  </footer>
);

const LandingPage: React.FC = () => {
  return (
    <div className="bg-white text-gray-900 min-h-screen">
      <LandingNavbar />
      <Hero />
      <SectionTitle id="features" title="Funcionalidades" subtitle="Tudo o que você precisa para dominar seu dinheiro." />
      <Placeholder />
      <SectionTitle id="testimonials" title="Depoimentos" />
      <Placeholder />
      <SectionTitle id="pricing" title="Planos e Preços" />
      <Placeholder />
      <Footer />
    </div>
  );
};

export default LandingPage;


