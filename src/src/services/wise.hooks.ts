/**
 * =====================================================
 * WISE PAYOUT HOOKS
 * =====================================================
 * Hooks para usar Wise em componentes React
 */

import { useState, useCallback, useEffect } from 'react';
import { wisePayoutService } from './wiseService';
import {
  CreateQuoteParams,
  CreateRecipientParams,
  CreateTransferParams,
  QuoteResult,
  RecipientResult,
  TransferResult,
  FundingResult,
  RecipientRequirement,
  TransferRequirement,
} from '../types/index';

/**
 * Hook: useWiseQuote
 * Gerenciar criacao e estado de quote
 */
export function useWiseQuote() {
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const createQuote = useCallback(async (params: CreateQuoteParams) => {
    setLoading(true);
    setError(null);
    try {
      const result = await wisePayoutService.createQuote(params);
      setQuote(result);

      // Verificar expiracao
      const expiresAt = new Date(result.expiresAt).getTime();
      const checkInterval = setInterval(() => {
        if (Date.now() > expiresAt) {
          setIsExpired(true);
          clearInterval(checkInterval);
        }
      }, 10000); // Verificar a cada 10s

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar cotacao';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearQuote = useCallback(() => {
    setQuote(null);
    setIsExpired(false);
    setError(null);
  }, []);

  return { quote, loading, error, isExpired, createQuote, clearQuote };
}

/**
 * Hook: useWiseRecipient
 * Gerenciar criacao de recipient com requisitos dinamicos
 */
export function useWiseRecipient() {
  const [recipient, setRecipient] = useState<RecipientResult | null>(null);
  const [requirements, setRequirements] = useState<RecipientRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRecipientRequirements = useCallback(async (quote: QuoteResult) => {
    setLoading(true);
    setError(null);
    try {
      const reqs = await wisePayoutService.validateRecipientRequirements(quote);
      setRequirements(reqs);
      return reqs;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar requisitos';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRecipient = useCallback(async (params: CreateRecipientParams) => {
    setLoading(true);
    setError(null);
    try {
      const result = await wisePayoutService.createRecipient(params);
      setRecipient(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar beneficiario';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearRecipient = useCallback(() => {
    setRecipient(null);
    setRequirements([]);
    setError(null);
  }, []);

  return {
    recipient,
    requirements,
    loading,
    error,
    getRecipientRequirements,
    createRecipient,
    clearRecipient,
  };
}

/**
 * Hook: useWiseTransfer
 * Gerenciar fluxo completo de transferencia
 */
export function useWiseTransfer() {
  const [transfer, setTransfer] = useState<TransferResult | null>(null);
  const [transferRequirements, setTransferRequirements] = useState<TransferRequirement[]>([]);
  const [funding, setFunding] = useState<FundingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'creating' | 'funding' | 'complete' | 'error'>('idle');

  const getTransferRequirements = useCallback(
    async (params: {
      profileId: number;
      quoteId: string;
      recipientId: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const reqs = await wisePayoutService.getTransferRequirements(params);
        setTransferRequirements(reqs);
        return reqs;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar requisitos';
        setError(message);
        setStep('error');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createTransfer = useCallback(async (params: CreateTransferParams) => {
    setLoading(true);
    setError(null);
    setStep('creating');
    try {
      const result = await wisePayoutService.createTransfer(params);
      setTransfer(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar transferencia';
      setError(message);
      setStep('error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fundTransfer = useCallback(
    async (params: { profileId: number; transferId: string; method: 'BALANCE' | 'CARD' | 'BANK_TRANSFER' }) => {
      setLoading(true);
      setError(null);
      setStep('funding');
      try {
        const result = await wisePayoutService.fundTransfer(params);
        setFunding(result);
        if (result.success) {
          setStep('complete');
        } else {
          setError(result.message);
          setStep('error');
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao fundear transferencia';
        setError(message);
        setStep('error');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setTransfer(null);
    setTransferRequirements([]);
    setFunding(null);
    setError(null);
    setStep('idle');
  }, []);

  return {
    transfer,
    transferRequirements,
    funding,
    loading,
    error,
    step,
    getTransferRequirements,
    createTransfer,
    fundTransfer,
    reset,
  };
}

/**
 * Hook: Observar mudancas de status de transferencia (polling)
 */
export function useWiseTransferStatus(transferId?: string) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!transferId) return;

    setLoading(true);
    try {
      const result = await wisePayoutService.getTransferStatus(transferId);
      setStatus(result.status);
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setLoading(false);
    }
  }, [transferId]);

  // Auto-polling a cada 30s
  useEffect(() => {
    if (!transferId) return;

    checkStatus();
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, [transferId, checkStatus]);

  return { status, loading, checkStatus };
}
