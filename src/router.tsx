import { createBrowserRouter } from 'react-router-dom';
import React, { lazy } from 'react';

// Lazy load all pages for code splitting
const ResumoPage = lazy(() => import('@/pages/ResumoPageWrapper'));
const ContasExtratoPage = lazy(() => import('@/pages/ContasExtratoPage'));
const FluxoCaixaPage = lazy(() => import('@/pages/FluxoCaixaPage'));
const CartoesPage = lazy(() => import('@/pages/CartoesPage'));
const InvestimentosPage = lazy(() => import('@/pages/InvestimentosPage'));
const PerfilPage = lazy(() => import('@/pages/PerfilPage'));
const CalculadoraJurosCompostosPage = lazy(() => import('@/pages/CalculadoraJurosCompostosPage'));
const CalculadoraReservaEmergenciaPage = lazy(() => import('@/pages/CalculadoraReservaEmergenciaPage'));
const ConfiguracoesPage = lazy(() => import('@/pages/ConfiguracoesPage'));
const CategoriasPage = lazy(() => import('@/pages/CategoriasPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ResumoPage />,
  },
  {
    path: '/resumo',
    element: <ResumoPage />,
  },
  {
    path: '/contas',
    element: <ContasExtratoPage />,
  },
  {
    path: '/contas-extrato', 
    element: <ContasExtratoPage />,
  },
  {
    path: '/fluxo',
    element: <FluxoCaixaPage />,
  },
  {
    path: '/cartoes',
    element: <CartoesPage />,
  },
  {
    path: '/investimentos',
    element: <InvestimentosPage />,
  },
  {
    path: '/perfil',
    element: <PerfilPage />,
  },
  {
    path: '/configuracoes',
    element: <ConfiguracoesPage />,
  },
  {
    path: '/categorias',
    element: <CategoriasPage />,
  },
  {
    path: '/calculadora-juros-compostos',
    element: <CalculadoraJurosCompostosPage />,
  },
  {
    path: '/calculadora-reserva-emergencia',
    element: <CalculadoraReservaEmergenciaPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);