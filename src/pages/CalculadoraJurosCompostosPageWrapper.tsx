import React from 'react';
import CalculadoraJurosCompostosPage from './CalculadoraJurosCompostosPage';

export default function CalculadoraJurosCompostosPageWrapper() {
  // This page doesn't need any props from contexts, it's a standalone calculator
  return <CalculadoraJurosCompostosPage />;
}