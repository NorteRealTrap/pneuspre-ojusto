-- ============================================================
-- MIGRATION: Criar tabelas para integração Wise Payout
-- Data: 2026-02-11
-- Descrição: Tabelas para gerenciar recipients, quotes, transfers
-- e webhook events da integração Wise Send Money API
-- ============================================================

-- Tabela: wise_recipients (beneficiários)
CREATE TABLE IF NOT EXISTS wise_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  wise_recipient_id VARCHAR(255) NOT NULL UNIQUE,
  hash VARCHAR(64) NOT NULL, -- SHA256 hash para evitar duplicatas
  currency VARCHAR(3) NOT NULL,
  account_type VARCHAR(50) NOT NULL, -- 'iban', 'bban', 'cpf', etc.
  account_holder_name VARCHAR(255) NOT NULL,
  details_json JSONB NOT NULL, -- Dados dinâmicos do recipient
  legal_type VARCHAR(20), -- 'PRIVATE' ou 'BUSINESS'
  confirmations_required BOOLEAN DEFAULT FALSE,
  confirmation_status VARCHAR(50), -- Status de verificação
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices
  UNIQUE(hash, usuario_id),
  CHECK (LENGTH(currency) = 3),
  CHECK (LENGTH(account_holder_name) >= 3)
);

CREATE INDEX IF NOT EXISTS idx_wise_recipients_usuario_id 
  ON wise_recipients(usuario_id);

CREATE INDEX IF NOT EXISTS idx_wise_recipients_wise_id 
  ON wise_recipients(wise_recipient_id);

CREATE INDEX IF NOT EXISTS idx_wise_recipients_hash 
  ON wise_recipients(hash);

CREATE INDEX IF NOT EXISTS idx_wise_recipients_active 
  ON wise_recipients(active) WHERE active = TRUE;

-- Tabela: wise_quotes (cotações)
CREATE TABLE IF NOT EXISTS wise_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  wise_quote_id VARCHAR(255) NOT NULL UNIQUE,
  wise_profile_id INTEGER NOT NULL,
  source_currency VARCHAR(3) NOT NULL,
  target_currency VARCHAR(3) NOT NULL,
  source_amount DECIMAL(20, 2),
  target_amount DECIMAL(20, 2),
  exchange_rate DECIMAL(20, 8) NOT NULL,
  fee_total DECIMAL(20, 2) NOT NULL,
  fee_percentage DECIMAL(5, 4),
  fee_fixed DECIMAL(20, 2),
  rate_type VARCHAR(20), -- 'FIXED' ou 'INDICATIVE'
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  
  -- Índices
  CHECK (LENGTH(source_currency) = 3),
  CHECK (LENGTH(target_currency) = 3),
  CHECK (source_amount IS NULL OR source_amount > 0),
  CHECK (target_amount IS NULL OR target_amount > 0),
  CHECK (exchange_rate > 0)
);

CREATE INDEX IF NOT EXISTS idx_wise_quotes_usuario_id 
  ON wise_quotes(usuario_id);

CREATE INDEX IF NOT EXISTS idx_wise_quotes_wise_id 
  ON wise_quotes(wise_quote_id);

CREATE INDEX IF NOT EXISTS idx_wise_quotes_expires_at 
  ON wise_quotes(expires_at);

CREATE INDEX IF NOT EXISTS idx_wise_quotes_currencies 
  ON wise_quotes(source_currency, target_currency);

-- Tabela: wise_transfers (transferências)
CREATE TABLE IF NOT EXISTS wise_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  wise_transfer_id VARCHAR(255) NOT NULL UNIQUE,
  wise_quote_id VARCHAR(255) NOT NULL REFERENCES wise_quotes(wise_quote_id) ON DELETE SET NULL,
  wise_recipient_id VARCHAR(255) NOT NULL REFERENCES wise_recipients(wise_recipient_id) ON DELETE RESTRICT,
  customer_transaction_id VARCHAR(255) NOT NULL UNIQUE, -- Para idempotência
  status VARCHAR(50) NOT NULL, -- 'draft', 'pending_approval', 'active', 'processing', 'outgoing_payment_sent', 'funds_returned', 'cancelled'
  source_currency VARCHAR(3) NOT NULL,
  target_currency VARCHAR(3) NOT NULL,
  source_amount DECIMAL(20, 2),
  target_amount DECIMAL(20, 2),
  exchange_rate DECIMAL(20, 8),
  metadata_json JSONB, -- Campos customizados (transferPurpose, sourceOfFunds, etc.)
  failure_reason VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices
  UNIQUE(usuario_id, customer_transaction_id),
  CHECK (LENGTH(source_currency) = 3),
  CHECK (LENGTH(target_currency) = 3)
);

CREATE INDEX IF NOT EXISTS idx_wise_transfers_usuario_id 
  ON wise_transfers(usuario_id);

CREATE INDEX IF NOT EXISTS idx_wise_transfers_wise_id 
  ON wise_transfers(wise_transfer_id);

CREATE INDEX IF NOT EXISTS idx_wise_transfers_quote_id 
  ON wise_transfers(wise_quote_id);

CREATE INDEX IF NOT EXISTS idx_wise_transfers_recipient_id 
  ON wise_transfers(wise_recipient_id);

CREATE INDEX IF NOT EXISTS idx_wise_transfers_customer_tx_id 
  ON wise_transfers(customer_transaction_id);

CREATE INDEX IF NOT EXISTS idx_wise_transfers_status 
  ON wise_transfers(status);

CREATE INDEX IF NOT EXISTS idx_wise_transfers_created_at 
  ON wise_transfers(created_at DESC);

-- Tabela: webhook_events (eventos de webhook da Wise)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL, -- 'transfers#state-change', 'recipient#verification-status-changed', etc.
  payload JSONB NOT NULL,
  signature_valid BOOLEAN,
  processed_at TIMESTAMP,
  processing_error VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices
  CHECK (LENGTH(event_type) >= 3)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_delivery_id 
  ON webhook_events(delivery_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type 
  ON webhook_events(event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at 
  ON webhook_events(processed_at) WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at 
  ON webhook_events(created_at DESC);

-- Tabela: payout_provider_config (para alternar entre provedores)
-- Feature flags e configuração de rota
CREATE TABLE IF NOT EXISTS payout_provider_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  provider VARCHAR(50) NOT NULL, -- 'blackcat', 'wise'
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0, -- Ordem de preferência
  config_json JSONB, -- Configuração específica do provider
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CHECK (LENGTH(provider) >= 2)
);

CREATE INDEX IF NOT EXISTS idx_payout_provider_config_name 
  ON payout_provider_config(name);

CREATE INDEX IF NOT EXISTS idx_payout_provider_config_provider 
  ON payout_provider_config(provider, enabled);

-- ============================================================
-- SEED DATA: Configurações iniciais de provider
-- ============================================================

-- Manter Blackcat como pay-in principal
INSERT INTO payout_provider_config (name, provider, enabled, priority, config_json)
VALUES 
  ('blackcat_checkout', 'blackcat', TRUE, 10, '{"mode": "pay-in", "version": "v2"}'),
  ('wise_payout', 'wise', TRUE, 5, '{"mode": "payout", "requirementsValidation": true, "tokenCache": "memory"}')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- FUNÇÃO: Atualizar updated_at em wise_transfers
-- ============================================================
CREATE OR REPLACE FUNCTION update_wise_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_wise_transfers_updated_at
  BEFORE UPDATE ON wise_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_wise_transfers_updated_at();

-- ============================================================
-- FUNÇÃO: Limpar webhook events processados (retention policy)
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_events 
  WHERE processed_at IS NOT NULL 
    AND created_at < NOW() - INTERVAL '90 days';
  
  DELETE FROM webhook_events 
  WHERE created_at < NOW() - INTERVAL '30 days' 
    AND processed_at IS NULL;
END;
$$ language 'plpgsql';

-- ============================================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================================

-- Ativar RLS nas tabelas
ALTER TABLE wise_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE wise_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wise_transfers ENABLE ROW LEVEL SECURITY;

-- Política: Usuários veem apenas seus próprios recipients
CREATE POLICY wise_recipients_user_isolation ON wise_recipients
  FOR SELECT
  USING (auth.uid() = usuario_id OR auth.uid() IS NULL);

CREATE POLICY wise_recipients_user_insert ON wise_recipients
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY wise_recipients_user_update ON wise_recipients
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Política: Usuários veem apenas suas próprias quotes
CREATE POLICY wise_quotes_user_isolation ON wise_quotes
  FOR SELECT
  USING (auth.uid() = usuario_id OR auth.uid() IS NULL);

CREATE POLICY wise_quotes_user_insert ON wise_quotes
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Política: Usuários veem apenas suas próprias transfers
CREATE POLICY wise_transfers_user_isolation ON wise_transfers
  FOR SELECT
  USING (auth.uid() = usuario_id OR auth.uid() IS NULL);

CREATE POLICY wise_transfers_user_insert ON wise_transfers
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY wise_transfers_user_update ON wise_transfers
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- ============================================================
-- COMENTÁRIOS DE TABELA (documentação)
-- ============================================================

COMMENT ON TABLE wise_recipients IS 'Beneficiários cadastrados na API Wise - dados dinâmicos por país/moeda';
COMMENT ON TABLE wise_quotes IS 'Cotações (quotes) geradas pela API Wise - definem taxa de câmbio e fees';
COMMENT ON TABLE wise_transfers IS 'Transferências em andamento - fluxo: quote -> recipient -> transfer -> funding';
COMMENT ON TABLE webhook_events IS 'Eventos de webhook recebidos da Wise - auditoria e rastreamento';
COMMENT ON TABLE payout_provider_config IS 'Configuração de provedores de payout - permite feature flags por provider';

