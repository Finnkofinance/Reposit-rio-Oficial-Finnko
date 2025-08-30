-- Migration: Adicionar campos de controle de estorno/cancelamento de pagamentos
-- Data: 2025-08-30
-- Descrição: Adiciona campos para rastrear status de pagamento, estornos e cancelamentos

-- 1. Adicionar colunas na tabela transacoes_banco
ALTER TABLE transacoes_banco 
ADD COLUMN IF NOT EXISTS status_pagamento VARCHAR(20) DEFAULT 'ativo' CHECK (status_pagamento IN ('ativo', 'estornado', 'cancelado'));

ALTER TABLE transacoes_banco 
ADD COLUMN IF NOT EXISTS motivo_estorno TEXT;

ALTER TABLE transacoes_banco 
ADD COLUMN IF NOT EXISTS data_estorno TIMESTAMPTZ;

ALTER TABLE transacoes_banco 
ADD COLUMN IF NOT EXISTS estornado_por UUID REFERENCES auth.users(id);

-- 2. Criar índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_transacoes_status_pagamento 
ON transacoes_banco(status_pagamento);

CREATE INDEX IF NOT EXISTS idx_transacoes_meta_pagamento_cartao_competencia 
ON transacoes_banco(meta_pagamento, cartao_id, competencia_fatura) 
WHERE meta_pagamento = true;

-- 3. Atualizar transações existentes para ter status 'ativo'
UPDATE transacoes_banco 
SET status_pagamento = 'ativo' 
WHERE status_pagamento IS NULL;

-- 4. Comentários nas colunas para documentação
COMMENT ON COLUMN transacoes_banco.status_pagamento IS 'Status do pagamento: ativo (padrão), estornado ou cancelado';
COMMENT ON COLUMN transacoes_banco.motivo_estorno IS 'Motivo do estorno ou cancelamento (se aplicável)';
COMMENT ON COLUMN transacoes_banco.data_estorno IS 'Data e hora do estorno ou cancelamento';
COMMENT ON COLUMN transacoes_banco.estornado_por IS 'ID do usuário que executou o estorno/cancelamento';

-- 5. Verificar se existe categoria de estorno, se não, criar
INSERT INTO categorias (id, nome, tipo, sistema, ordem, created_at, updated_at)
SELECT 
    'categoria-estorno-' || gen_random_uuid()::text,
    'Estorno',
    'Entrada'::tipo_categoria,
    true,
    999,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM categorias 
    WHERE nome = 'Estorno' AND tipo = 'Entrada' AND sistema = true
);

-- 6. Criar função para atualizar automaticamente o updated_at
CREATE OR REPLACE FUNCTION update_transaction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar trigger se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_transacoes_updated_at') THEN
        CREATE TRIGGER update_transacoes_updated_at
            BEFORE UPDATE ON transacoes_banco
            FOR EACH ROW
            EXECUTE FUNCTION update_transaction_updated_at();
    END IF;
END$$;

-- 8. Política RLS para permitir operações de estorno (se RLS estiver habilitado)
-- Nota: Ajuste conforme suas políticas RLS existentes
DO $$
BEGIN
    -- Verifica se RLS está habilitado na tabela
    IF EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'transacoes_banco' 
        AND n.nspname = current_schema() 
        AND c.relrowsecurity = true
    ) THEN
        -- Atualizar política existente ou criar nova se necessário
        -- (Ajuste conforme sua implementação específica de RLS)
        RAISE NOTICE 'RLS está habilitado. Verifique se as políticas permitem operações de estorno.';
    END IF;
END$$;

-- 9. Verificações pós-migração
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'transacoes_banco' 
AND column_name IN ('status_pagamento', 'motivo_estorno', 'data_estorno', 'estornado_por')
ORDER BY column_name;

-- Verificar se a categoria de estorno foi criada
SELECT id, nome, tipo, sistema 
FROM categorias 
WHERE nome = 'Estorno' AND tipo = 'Entrada' AND sistema = true;