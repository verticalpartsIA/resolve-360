-- Melhoria 2: Novas causas raiz — Produto e Produção
ALTER TYPE root_cause ADD VALUE IF NOT EXISTS 'produto';
ALTER TYPE root_cause ADD VALUE IF NOT EXISTS 'producao';

-- Melhoria 4: Família do produto na abertura da ocorrência
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS product_family TEXT;
