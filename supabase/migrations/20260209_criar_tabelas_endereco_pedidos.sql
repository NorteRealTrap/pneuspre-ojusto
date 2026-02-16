-- ============================================================
-- MIGRATION: Criar tabelas de endereço e pedidos
-- Data: 2026-02-09
-- Descrição: Tabelas para validação e armazenamento de endereço
-- e rastreamento de pedidos/transações com Blackcat
-- ============================================================


-- Pre-requisito para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Base de catalogo usada por outras migrations (pedido_itens/order_items).
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  width VARCHAR(10) NOT NULL,
  profile VARCHAR(10) NOT NULL,
  diameter VARCHAR(10) NOT NULL,
  load_index VARCHAR(10) NOT NULL,
  speed_rating VARCHAR(10) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  old_price DECIMAL(10, 2),
  stock INTEGER NOT NULL DEFAULT 0,
  image TEXT NOT NULL,
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  category VARCHAR(50) NOT NULL,
  season VARCHAR(50) NOT NULL DEFAULT 'all-season',
  runflat BOOLEAN NOT NULL DEFAULT FALSE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);
-- Criar tabela de endereços
CREATE TABLE IF NOT EXISTS enderecos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo VARCHAR(255) NOT NULL,
  rua VARCHAR(255) NOT NULL,
  numero VARCHAR(10) NOT NULL,
  complemento VARCHAR(255),
  cidade VARCHAR(100) NOT NULL,
  estado VARCHAR(2) NOT NULL CHECK (LENGTH(estado) = 2),
  cep VARCHAR(8) NOT NULL CHECK (LENGTH(cep) = 8),
  verificado BOOLEAN DEFAULT TRUE,
  endereco_padrao BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(usuario_id, cep, numero, rua),
  CHECK (LENGTH(nome_completo) >= 3),
  CHECK (LENGTH(rua) >= 3)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_enderecos_usuario_id 
  ON enderecos(usuario_id);

CREATE INDEX IF NOT EXISTS idx_enderecos_usuario_padrao 
  ON enderecos(usuario_id, endereco_padrao) 
  WHERE endereco_padrao = TRUE;

CREATE INDEX IF NOT EXISTS idx_enderecos_cep 
  ON enderecos(cep);

-- Criar tabela de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endereco_id UUID NOT NULL REFERENCES enderecos(id),
  numero_pedido VARCHAR(50) NOT NULL UNIQUE,
  valor DECIMAL(12, 2) NOT NULL CHECK (valor > 0),
  valor_desconto DECIMAL(12, 2) DEFAULT 0,
  valor_frete DECIMAL(12, 2) DEFAULT 0,
  valor_total DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pendente' CHECK (
    status IN ('pendente', 'confirmado', 'processando', 'aprovado', 'enviado', 'entregue', 'cancelado', 'reembolsado')
  ),
  
  -- Dados de pagamento
  transaction_id VARCHAR(255) UNIQUE,
  metodo_pagamento VARCHAR(50) DEFAULT 'credito',
  parcelas SMALLINT DEFAULT 1 CHECK (parcelas BETWEEN 1 AND 12),
  status_pagamento VARCHAR(50) DEFAULT 'pendente' CHECK (
    status_pagamento IN ('pendente', 'processando', 'aprovado', 'rejeitado', 'erro', 'reembolsado')
  ),
  
  -- Tracking
  numero_rastreamento VARCHAR(50),
  transportadora VARCHAR(100),
  data_envio TIMESTAMP,
  data_entrega TIMESTAMP,
  tentativas_pagamento SMALLINT DEFAULT 0 CHECK (tentativas_pagamento >= 0),
  
  -- Notas
  observacoes TEXT,
  motivo_cancelamento TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Criar índices para pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_id 
  ON pedidos(usuario_id);

CREATE INDEX IF NOT EXISTS idx_pedidos_status 
  ON pedidos(status);

CREATE INDEX IF NOT EXISTS idx_pedidos_transaction_id 
  ON pedidos(transaction_id);

CREATE INDEX IF NOT EXISTS idx_pedidos_numero_rastreamento 
  ON pedidos(numero_rastreamento);

CREATE INDEX IF NOT EXISTS idx_pedidos_created_at 
  ON pedidos(created_at DESC);

-- Criar tabela de itens do pedido
CREATE TABLE IF NOT EXISTS pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES products(id),
  quantidade SMALLINT NOT NULL CHECK (quantidade > 0),
  preco_unitario DECIMAL(10, 2) NOT NULL CHECK (preco_unitario >= 0),
  preco_total DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido_id 
  ON pedido_itens(pedido_id);

-- Criar tabela de histórico de status do pedido
CREATE TABLE IF NOT EXISTS pedido_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  status_anterior VARCHAR(50),
  status_novo VARCHAR(50) NOT NULL,
  motivo VARCHAR(255),
  criado_por VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedido_historico_pedido_id 
  ON pedido_historico(pedido_id);

-- Criar tabela de transações Blackcat
CREATE TABLE IF NOT EXISTS blackcat_transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  valor DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (
    status IN ('aprovado', 'pendente', 'rejeitado', 'erro', 'reembolsado')
  ),
  codigo_resposta VARCHAR(50),
  mensagem_resposta TEXT,
  dados_request JSONB,
  dados_response JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  processado_em TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blackcat_pedido_id 
  ON blackcat_transacoes(pedido_id);

CREATE INDEX IF NOT EXISTS idx_blackcat_transaction_id 
  ON blackcat_transacoes(transaction_id);

CREATE INDEX IF NOT EXISTS idx_blackcat_status 
  ON blackcat_transacoes(status);

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- View: Pedidos com informações do cliente e endereço
CREATE OR REPLACE VIEW v_pedidos_detalhes AS
SELECT
  p.id,
  p.numero_pedido,
  p.usuario_id,
  u.email,
  p.valor,
  p.valor_desconto,
  p.valor_frete,
  p.valor_total,
  p.status,
  p.status_pagamento,
  p.transaction_id,
  p.numero_rastreamento,
  p.transportadora,
  p.data_envio,
  p.data_entrega,
  e.nome_completo,
  e.rua,
  e.numero,
  e.complemento,
  e.cidade,
  e.estado,
  e.cep,
  p.created_at,
  p.updated_at
FROM pedidos p
JOIN auth.users u ON p.usuario_id = u.id
JOIN enderecos e ON p.endereco_id = e.id
WHERE p.deleted_at IS NULL;

-- View: Estatísticas de vendas
CREATE OR REPLACE VIEW v_vendas_stats AS
SELECT
  DATE(p.created_at) AS data,
  COUNT(p.id) AS total_pedidos,
  SUM(p.valor_total) AS valor_total,
  AVG(p.valor_total) AS ticket_medio,
  SUM(CASE WHEN p.status_pagamento = 'aprovado' THEN 1 ELSE 0 END) AS pagamentos_aprovados,
  SUM(CASE WHEN p.status_pagamento = 'rejeitado' THEN 1 ELSE 0 END) AS pagamentos_rejeitados
FROM pedidos p
WHERE p.deleted_at IS NULL
GROUP BY DATE(p.created_at)
ORDER BY data DESC;

-- ============================================================
-- FUNÇÕES
-- ============================================================

-- Função: Gerar número de pedido único
CREATE OR REPLACE FUNCTION gerar_numero_pedido()
RETURNS VARCHAR AS $$
BEGIN
  RETURN 'PED-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
         LPAD(NEXTVAL('seq_pedidos')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Criar sequência para números de pedido
CREATE SEQUENCE IF NOT EXISTS seq_pedidos START 1000;

-- Função: Atualizar timestamp updated_at
CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trigger_enderecos_updated_at
  BEFORE UPDATE ON enderecos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS
ALTER TABLE enderecos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_historico ENABLE ROW LEVEL SECURITY;

-- Policies para endereços
CREATE POLICY "Usuários podem ver seus próprios endereços"
  ON enderecos FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem inserir endereços"
  ON enderecos FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar seus endereços"
  ON enderecos FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar seus endereços"
  ON enderecos FOR DELETE
  USING (auth.uid() = usuario_id);

-- Policies para pedidos
CREATE POLICY "Usuários podem ver seus próprios pedidos"
  ON pedidos FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem inserir pedidos"
  ON pedidos FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Policies para itens do pedido
CREATE POLICY "Usuários podem ver itens de seus pedidos"
  ON pedido_itens FOR SELECT
  USING (
    pedido_id IN (
      SELECT id FROM pedidos WHERE usuario_id = auth.uid()
    )
  );

-- Policies para histórico
CREATE POLICY "Usuários podem ver histórico de seus pedidos"
  ON pedido_historico FOR SELECT
  USING (
    pedido_id IN (
      SELECT id FROM pedidos WHERE usuario_id = auth.uid()
    )
  );

-- ============================================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO
-- ============================================================

COMMENT ON TABLE enderecos IS 'Endereços de entrega dos usuários com validação';
COMMENT ON TABLE pedidos IS 'Pedidos de compra com rastreamento de pagamento e envio';
COMMENT ON TABLE pedido_itens IS 'Itens individuais dentro de cada pedido';
COMMENT ON TABLE pedido_historico IS 'Histórico de alterações de status dos pedidos';
COMMENT ON TABLE blackcat_transacoes IS 'Registro de transações com o gateway Blackcat';

COMMENT ON COLUMN pedidos.numero_pedido IS 'Número único do pedido no formato PED-YYYYMMDD-XXXXXX';
COMMENT ON COLUMN pedidos.status_pagamento IS 'Status específico da transação de pagamento';
COMMENT ON COLUMN pedidos.tentativas_pagamento IS 'Número de tentativas de processamento';
COMMENT ON COLUMN blackcat_transacoes.dados_request IS 'Dados enviados para o Blackcat (JSON)';
COMMENT ON COLUMN blackcat_transacoes.dados_response IS 'Resposta recebida do Blackcat (JSON)';

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
