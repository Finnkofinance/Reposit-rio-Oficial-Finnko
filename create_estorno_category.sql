-- Script para criar categoria de Estorno
-- Execute este script no Supabase para criar a categoria de estorno

-- Primeiro, verificar se já existe a categoria
DO $$
BEGIN
    -- Criar categoria de Estorno se não existir
    IF NOT EXISTS (
        SELECT 1 FROM categorias 
        WHERE nome = 'Estorno' AND tipo = 'Entrada' AND sistema = true
    ) THEN
        INSERT INTO categorias (id, nome, tipo, sistema, ordem, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'Estorno',
            'Entrada'::tipo_categoria,
            true,
            999, -- ordem alta para aparecer no final
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Categoria "Estorno" criada com sucesso!';
    ELSE
        RAISE NOTICE 'Categoria "Estorno" já existe.';
    END IF;
END $$;

-- Verificar se foi criada corretamente
SELECT 
    id, 
    nome, 
    tipo, 
    sistema, 
    ordem,
    created_at
FROM categorias 
WHERE nome = 'Estorno' AND tipo = 'Entrada' AND sistema = true;