/**
 * =====================================================
 * EXAMPLE: Wise Payout Form Component
 * =====================================================
 * Demonstra o fluxo completo de payout usando a integração Wise
 * Copie e customize para seu caso de uso
 */

import React, { useState } from 'react';
import {
  useWiseQuote,
  useWiseRecipient,
  useWiseTransfer,
  useWiseTransferStatus,
  generateCustomerTransactionId,
  formatWiseAmount,
  validateRequirementsFilled,
  mapWiseError,
  getTransferStatusDisplay,
} from '../../services';
import {
  CreateRecipientParams,
  CreateTransferParams,
  RecipientRequirement,
  TransferRequirement,
} from '../../types';

interface WisePayoutFormProps {
  userId: string;
  onPayoutComplete?: (transferId: string) => void;
}

export function WisePayoutForm({ userId, onPayoutComplete }: WisePayoutFormProps) {
  // Estado dos hooks
  const quote = useWiseQuote();
  const recipient = useWiseRecipient();
  const transfer = useWiseTransfer();
  const transferStatus = useWiseTransferStatus(transfer.transfer?.id);

  // Estado do formulário
  const [step, setStep] = useState<'quote' | 'recipient' | 'transfer' | 'confirm'>('quote');
  const [formData, setFormData] = useState({
    // Quote
    sourceCurrency: 'BRL',
    targetCurrency: 'USD',
    sourceAmount: '',
    targetAmount: '',

    // Recipient
    recipientType: 'iban',
    accountHolderName: '',
    dynamicFields: {} as Record<string, string>,

    // Transfer
    transferPurpose: '',
    sourceOfFunds: '',
  });

  const profileId = 123; // TODO: obter do contexto/auth

  // =====================================================
  // STEP 1: QUOTE
  // =====================================================

  const handleCreateQuote = async () => {
    try {
      await quote.createQuote({
        profileId,
        sourceCurrency: formData.sourceCurrency as any,
        targetCurrency: formData.targetCurrency as any,
        sourceAmount: formData.sourceAmount ? parseFloat(formData.sourceAmount) : undefined,
      });
      setStep('recipient');
    } catch (error) {
      console.error('Erro ao criar cotação:', error);
    }
  };

  // =====================================================
  // STEP 2: RECIPIENT
  // =====================================================

  const handleLoadRecipientRequirements = async () => {
    if (!quote.quote) return;

    try {
      await recipient.getRecipientRequirements(quote.quote);
    } catch (error) {
      console.error('Erro ao carregar requisitos:', error);
    }
  };

  const handleCreateRecipient = async () => {
    if (!quote.quote) return;

    try {
      const params: CreateRecipientParams = {
        profileId,
        currency: quote.quote.targetCurrency,
        type: formData.recipientType as any,
        accountHolderName: formData.accountHolderName,
        details: formData.dynamicFields,
      };

      await recipient.createRecipient(params);
      setStep('transfer');
    } catch (error) {
      console.error('Erro ao criar beneficiário:', error);
    }
  };

  // =====================================================
  // STEP 3: TRANSFER
  // =====================================================

  const handleLoadTransferRequirements = async () => {
    if (!quote.quote || !recipient.recipient) return;

    try {
      await transfer.getTransferRequirements({
        profileId,
        quoteId: quote.quote.id,
        recipientId: recipient.recipient.id,
      });
    } catch (error) {
      console.error('Erro ao carregar requisitos de transfer:', error);
    }
  };

  const handleCreateTransfer = async () => {
    if (!quote.quote || !recipient.recipient) return;

    try {
      const params: CreateTransferParams = {
        profileId,
        quote: quote.quote,
        recipient: recipient.recipient,
        customerTransactionId: generateCustomerTransactionId(`payout-${userId}`),
        transferPurpose: formData.transferPurpose,
        sourceOfFunds: formData.sourceOfFunds,
      };

      await transfer.createTransfer(params);
      setStep('confirm');
    } catch (error) {
      console.error('Erro ao criar transferência:', error);
    }
  };

  const handleFundTransfer = async () => {
    if (!transfer.transfer) return;

    try {
      const result = await transfer.fundTransfer({
        profileId,
        transferId: transfer.transfer.id,
        method: 'BALANCE',
      });

      if (result.success) {
        onPayoutComplete?.(transfer.transfer.id);
      }
    } catch (error) {
      console.error('Erro ao fundear transferência:', error);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="wise-payout-form" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>Transferência Internacional (Wise)</h2>

      {/* STEP 1: QUOTE */}
      {step === 'quote' && (
        <section className="step-quote">
          <h3>1. Cotação</h3>

          <div>
            <label>
              Moeda de Origem:
              <select
                value={formData.sourceCurrency}
                onChange={(e) => setFormData({ ...formData, sourceCurrency: e.target.value })}
              >
                <option value="BRL">BRL (Real)</option>
                <option value="USD">USD (Dólar)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </label>
          </div>

          <div>
            <label>
              Moeda de Destino:
              <select
                value={formData.targetCurrency}
                onChange={(e) => setFormData({ ...formData, targetCurrency: e.target.value })}
              >
                <option value="USD">USD (Dólar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (Libra)</option>
              </select>
            </label>
          </div>

          <div>
            <label>
              Valor:
              <input
                type="number"
                placeholder="Valor em BRL"
                value={formData.sourceAmount}
                onChange={(e) => setFormData({ ...formData, sourceAmount: e.target.value })}
              />
            </label>
          </div>

          <button onClick={handleCreateQuote} disabled={quote.loading || !formData.sourceAmount}>
            {quote.loading ? 'Carregando...' : 'Obter Cotação'}
          </button>

          {quote.error && <p style={{ color: 'red' }}>{quote.error}</p>}

          {quote.quote && (
            <div style={{ backgroundColor: '#f0f0f0', padding: '10px', marginTop: '10px' }}>
              <p>
                <strong>Taxa:</strong> {quote.quote.rate}
              </p>
              <p>
                <strong>Fee:</strong> {formatWiseAmount(quote.quote.fee.total, formData.sourceCurrency)}
              </p>
              <p>
                <strong>Expira em:</strong> {new Date(quote.quote.expiresAt).toLocaleString('pt-BR')}
              </p>
              {quote.isExpired && (
                <p style={{ color: 'red' }}>
                  ⚠️ Cotação expirou! Clique em "Obter Cotação" novamente.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* STEP 2: RECIPIENT */}
      {step === 'recipient' && quote.quote && (
        <section className="step-recipient">
          <h3>2. Beneficiário</h3>

          {recipient.requirements.length === 0 && (
            <button onClick={handleLoadRecipientRequirements} disabled={recipient.loading}>
              {recipient.loading ? 'Carregando requisitos...' : 'Carregar Requisitos'}
            </button>
          )}

          {recipient.requirements.length > 0 && (
            <>
              <div>
                <label>
                  Nome do Titular:
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={formData.accountHolderName}
                    onChange={(e) =>
                      setFormData({ ...formData, accountHolderName: e.target.value })
                    }
                  />
                </label>
              </div>

              {recipient.requirements.map((req: RecipientRequirement) => (
                <div key={req.key}>
                  <label>
                    {req.label}
                    {req.type === 'select' ? (
                      <select
                        value={formData.dynamicFields[req.key] || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dynamicFields: {
                              ...formData.dynamicFields,
                              [req.key]: e.target.value,
                            },
                          })
                        }
                      >
                        <option value="">-- Selecionar --</option>
                        {req.valuesAllowed?.map((opt: { key: string; label: string }) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={req.type === 'date' ? 'date' : 'text'}
                        placeholder={req.label}
                        value={formData.dynamicFields[req.key] || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dynamicFields: {
                              ...formData.dynamicFields,
                              [req.key]: e.target.value,
                            },
                          })
                        }
                      />
                    )}
                  </label>
                </div>
              ))}

              <button
                onClick={handleCreateRecipient}
                disabled={
                  recipient.loading ||
                  !validateRequirementsFilled(recipient.requirements, formData.dynamicFields).valid
                }
              >
                {recipient.loading ? 'Criando...' : 'Próximo: Detalhes da Transferência'}
              </button>
            </>
          )}

          {recipient.error && <p style={{ color: 'red' }}>{mapWiseError(recipient.error)}</p>}
        </section>
      )}

      {/* STEP 3: TRANSFER DETAILS */}
      {step === 'transfer' && quote.quote && recipient.recipient && (
        <section className="step-transfer">
          <h3>3. Detalhes da Transferência</h3>

          {transfer.transferRequirements.length === 0 && (
            <button
              onClick={handleLoadTransferRequirements}
              disabled={transfer.loading}
            >
              {transfer.loading ? 'Carregando...' : 'Carregar Requisitos de Compliance'}
            </button>
          )}

          {transfer.transferRequirements.length > 0 && (
            <>
              {transfer.transferRequirements.map((req: TransferRequirement) => (
                <div key={req.key}>
                  <label>
                    {req.label}
                    {req.type === 'select' ? (
                      <select
                        value={
                          req.key === 'transferPurpose'
                            ? formData.transferPurpose
                            : req.key === 'sourceOfFunds'
                              ? formData.sourceOfFunds
                              : ''
                        }
                        onChange={(e) => {
                          if (req.key === 'transferPurpose') {
                            setFormData({ ...formData, transferPurpose: e.target.value });
                          } else if (req.key === 'sourceOfFunds') {
                            setFormData({ ...formData, sourceOfFunds: e.target.value });
                          }
                        }}
                      >
                        <option value="">-- Selecionar --</option>
                        {req.valuesAllowed?.map((opt: { key: string; label: string }) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder={req.label}
                        onChange={(e) => {
                          if (req.key === 'sourceOfFundsOther') {
                            // TODO: criar campo no formData
                          }
                        }}
                      />
                    )}
                  </label>
                </div>
              ))}

              <button
                onClick={handleCreateTransfer}
                disabled={
                  transfer.loading ||
                  !validateRequirementsFilled(transfer.transferRequirements, formData).valid
                }
              >
                {transfer.loading ? 'Criando...' : 'Próximo: Confirmação'}
              </button>
            </>
          )}

          {transfer.error && <p style={{ color: 'red' }}>{mapWiseError(transfer.error)}</p>}
        </section>
      )}

      {/* STEP 4: CONFIRM & FUND */}
      {step === 'confirm' && transfer.transfer && quote.quote && (
        <section className="step-confirm">
          <h3>4. Confirmação</h3>

          <div style={{ backgroundColor: '#e8f5e9', padding: '10px', marginBottom: '10px' }}>
            <p>
              <strong>De:</strong> {formatWiseAmount(transfer.transfer.sourceAmount || 0, transfer.transfer.sourceCurrency)}
            </p>
            <p>
              <strong>Para:</strong> {formatWiseAmount(transfer.transfer.targetAmount || 0, transfer.transfer.targetCurrency)}
            </p>
            <p>
              <strong>Beneficiário:</strong> {recipient.recipient?.accountHolderName}
            </p>
            <p>
              <strong>Status:</strong> {getTransferStatusDisplay(transfer.transfer.status).label}
            </p>
          </div>

          {!transferStatus.status || transferStatus.status === 'draft' ? (
            <button
              onClick={handleFundTransfer}
              disabled={transfer.loading}
              style={{ backgroundColor: 'green', color: 'white', padding: '10px 20px' }}
            >
              {transfer.loading ? 'Processando...' : 'Enviar Transferência'}
            </button>
          ) : (
            <>
              <p>
                <strong>Status Atual:</strong> {getTransferStatusDisplay(transferStatus.status).label}{' '}
                {getTransferStatusDisplay(transferStatus.status).icon}
              </p>
              <button onClick={transferStatus.checkStatus} disabled={transferStatus.loading}>
                {transferStatus.loading ? 'Atualizando...' : 'Atualizar Status'}
              </button>
            </>
          )}

          {transfer.error && <p style={{ color: 'red' }}>{mapWiseError(transfer.error)}</p>}
        </section>
      )}

      {/* DEBUG INFO */}
      {import.meta.env.DEV && (
        <details style={{ marginTop: '20px', fontSize: '12px' }}>
          <summary>Debug Info</summary>
          <pre>{JSON.stringify({ quote: quote.quote, recipient: recipient.recipient, transfer: transfer.transfer }, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

export default WisePayoutForm;
