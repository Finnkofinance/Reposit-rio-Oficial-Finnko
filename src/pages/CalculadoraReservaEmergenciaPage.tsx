import React from 'react';
import PageHeader from '@/components/PageHeader';
import CalculadoraReservaEmergencia from '@/components/CalculadoraReservaEmergencia';

const CalculadoraReservaEmergenciaPage: React.FC = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Calculadora de Reserva de Emergência"
      />
      <div className="mt-8">
        <CalculadoraReservaEmergencia />
      </div>
    </div>
  );
};

export default CalculadoraReservaEmergenciaPage;
