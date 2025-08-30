export enum TipoCategoria {
  Entrada = 'Entrada',
  Saida = 'Saida',
  Investimento = 'Investimento',
  Transferencia = 'Transferencia',
  Estorno = 'Estorno',
}

export enum BandeiraCartao {
  Visa = 'Visa',
  Mastercard = 'Mastercard',
  Elo = 'Elo',
  Amex = 'Amex',
  Hipercard = 'Hipercard',
  Outra = 'Outra',
}

export interface ContaBancaria {
  id: string;
  nome: string;
  saldo_inicial: number; // Will be deprecated in logic, but kept for migration/structure
  data_inicial: string; // YYYY-MM-DD
  ativo: boolean;
  cor?: string; // hex color
  createdAt?: string;
  updatedAt?: string;
}

export interface Cartao {
  id: string;
  apelido: string;
  dia_fechamento: number;
  dia_vencimento: number;
  limite: number | null;
  bandeira: BandeiraCartao;
  cor: string; // hex color
  conta_id_padrao?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Categoria {
  id: string;
  nome: string;
  tipo: TipoCategoria;
  sistema: boolean;
  orcamento_mensal?: number | null;
  ordem?: number; // ordem relativa dentro do próprio tipo (Entrada/Saída/Investimento)
  createdAt?: string;
  updatedAt?: string;
}

export interface TransacaoBanco {
  id: string;
  conta_id: string;
  data: string; // YYYY-MM-DD
  valor: number;
  categoria_id: string;
  tipo: TipoCategoria;
  descricao: string;
  transferencia_par_id?: string | null;
  previsto: boolean;
  realizado: boolean;
  // New fields for bill payments
  cartao_id?: string | null;
  competencia_fatura?: string | null; // YYYY-MM
  meta_pagamento?: boolean;
  // New field for initial balance transaction
  meta_saldo_inicial?: boolean;
  // New field for recurring transactions
  recorrencia?: 'diario' | 'semanal' | 'mensal' | 'anual' | null;
  recorrencia_id?: string | null; // To group recurring transactions
  // New field for investment goals
  objetivo_id?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompraCartao {
  id: string;
  cartao_id: string;
  data_compra: string; // YYYY-MM-DD
  valor_total: number;
  parcelas_total: number;
  categoria_id: string;
  descricao: string;
  estorno: boolean;
  // New fields for recurring purchases
  recorrencia?: 'mensal' | 'anual' | null;
  recorrencia_id?: string | null; // To group recurring purchases
  createdAt?: string;
  updatedAt?: string;
}

export interface ParcelaCartao {
  id: string;
  compra_id: string;
  n_parcela: number;
  valor_parcela: number;
  competencia_fatura: string; // YYYY-MM
  paga?: boolean; // indica se a parcela foi paga
  createdAt?: string;
  updatedAt?: string;
}

export interface ObjetivoInvestimento {
    id: string;
    nome: string;
    valor_meta: number;
    data_meta: string; // YYYY-MM-DD
    createdAt?: string;
    updatedAt?: string;
}

export enum CategoriaAtivo {
    RendaVariavel = 'Renda Variável',
    RendaFixa = 'Renda Fixa',
    Outros = 'Outros',
}

export interface Ativo {
    id: string;
    nome: string; // e.g., PETR4, Tesouro Selic 2029
    categoria: CategoriaAtivo;
    classe_ativo: string; // e.g., Ação, FII, CDB
    quantidade: number;
    data_compra: string; // YYYY-MM-DD
    valor_compra_unitario: number;
    valor_atual_unitario: number;
    observacao?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Alocacao {
    id: string;
    ativo_id: string;
    objetivo_id: string;
    percentual: number; // 0-100
}


export type Page = 'contas-extrato' | 'cartoes' | 'fluxo' | 'resumo' | 'investimentos' | 'perfil' | 'calculadora-juros-compostos' | 'calculadora-reserva-emergencia' | 'categorias-nav';

export type ModalState = {
    modal: string | null;
    data?: any;
};

export type NavigationState = {
    viewId?: 'all' | string;
    month?: string;
    filters?: any;
    action?: 'open-add-modal' | 'open-add-categoria-modal';
};

export interface Settings {
    showPercentageChange: boolean;
}