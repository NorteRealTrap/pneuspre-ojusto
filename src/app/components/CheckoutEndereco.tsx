import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MapPin, AlertCircle, CheckCircle, Loader } from 'lucide-react';

export interface EnderecoData {
  rua: string;
  numero: string;
  complemento?: string;
  cidade: string;
  estado: string;
  cep: string;
  nomeCompleto: string;
}

interface CheckoutEnderecoProps {
  onEnderecoValido: (dados: EnderecoData) => void;
  carregando?: boolean;
}

export function CheckoutEndereco({ onEnderecoValido, carregando: carregandoProps }: CheckoutEnderecoProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<EnderecoData>({
    defaultValues: {
      nomeCompleto: '',
      cep: '',
      rua: '',
      numero: '',
      complemento: '',
      cidade: '',
      estado: ''
    }
  });

  const [carregando, setCarregando] = useState(false);
  const [cepeValido, setCepValido] = useState(false);
  const [errosCep, setErrosCep] = useState<string>('');
  const cepValue = watch('cep');

  // Buscar dados do CEP automaticamente (ViaCEP)
  const handleCepChange = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    setErrosCep('');
    setCepValido(false);

    if (cepLimpo.length === 8) {
      setCarregando(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setValue('rua', data.logradouro || '');
          setValue('cidade', data.localidade || '');
          setValue('estado', data.uf || '');
          setCepValido(true);
        } else {
          setErrosCep('CEP não encontrado. Verifique e tente novamente.');
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        setErrosCep('Erro ao buscar CEP. Tente mais tarde.');
      } finally {
        setCarregando(false);
      }
    }
  };

  const formatarCep = (valor: string) => {
    const cepLimpo = valor.replace(/\D/g, '');
    if (cepLimpo.length <= 5) {
      return cepLimpo;
    }
    return `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5, 8)}`;
  };

  const validarEndereco = (dados: EnderecoData): boolean => {
    const cepRegex = /^\d{5}-?\d{3}$/;

    if (!cepRegex.test(dados.cep)) {
      setErrosCep('CEP inválido. Use o formato 12345-678');
      return false;
    }

    if (dados.nomeCompleto.trim().length < 3) {
      return false;
    }

    if (dados.rua.trim().length < 3) {
      return false;
    }

    if (dados.numero.trim().length === 0) {
      return false;
    }

    return true;
  };

  const onSubmit = async (dados: EnderecoData) => {
    if (!validarEndereco(dados)) {
      return;
    }

    onEnderecoValido(dados);
  };

  const isLoading = carregando || carregandoProps;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="checkout-endereco-form">
      <div className="checkout-endereco-header">
        <div className="checkout-endereco-icon">
          <MapPin size={24} />
        </div>
        <h2 className="checkout-endereco-title">Endereço de Entrega</h2>
      </div>

      {/* Nome Completo */}
      <div className="checkout-form-group">
        <label htmlFor="nomeCompleto" className="checkout-form-label">
          Nome Completo *
        </label>
        <input
          id="nomeCompleto"
          {...register('nomeCompleto', { 
            required: 'Nome completo é obrigatório',
            minLength: { value: 3, message: 'Nome deve ter no mínimo 3 caracteres' }
          })}
          placeholder="Seu nome completo"
          className={`checkout-form-input ${errors.nomeCompleto ? 'error' : ''}`}
          disabled={isLoading}
        />
        {errors.nomeCompleto && (
          <span className="checkout-form-error">
            <AlertCircle size={16} />
            {errors.nomeCompleto.message}
          </span>
        )}
      </div>

      {/* CEP */}
      <div className="checkout-form-group">
        <label htmlFor="cep" className="checkout-form-label">
          CEP *
        </label>
        <div className="checkout-form-input-wrapper">
          <input
            id="cep"
            {...register('cep', { required: 'CEP é obrigatório' })}
            placeholder="12345-678"
            onChange={(e) => {
              const formatted = formatarCep(e.target.value);
              setValue('cep', formatted);
              if (formatted.replace(/\D/g, '').length === 8) {
                handleCepChange(formatted);
              }
            }}
            className={`checkout-form-input ${errors.cep ? 'error' : ''} ${cepeValido ? 'success' : ''}`}
            disabled={isLoading}
            maxLength={9}
          />
          {isLoading && <Loader className="checkout-form-loader" size={20} />}
          {cepeValido && !isLoading && <CheckCircle className="checkout-form-success" size={20} />}
        </div>
        {errors.cep && (
          <span className="checkout-form-error">
            <AlertCircle size={16} />
            {errors.cep.message}
          </span>
        )}
        {errosCep && (
          <span className="checkout-form-error">
            <AlertCircle size={16} />
            {errosCep}
          </span>
        )}
      </div>

      {/* Rua */}
      <div className="checkout-form-group">
        <label htmlFor="rua" className="checkout-form-label">
          Rua *
        </label>
        <input
          id="rua"
          {...register('rua', { 
            required: 'Rua é obrigatória',
            minLength: { value: 3, message: 'Rua deve ter no mínimo 3 caracteres' }
          })}
          placeholder="Rua Principal"
          className={`checkout-form-input ${errors.rua ? 'error' : ''}`}
          disabled={isLoading || carregando}
        />
        {errors.rua && (
          <span className="checkout-form-error">
            <AlertCircle size={16} />
            {errors.rua.message}
          </span>
        )}
      </div>

      {/* Número e Complemento */}
      <div className="checkout-form-row">
        <div className="checkout-form-group">
          <label htmlFor="numero" className="checkout-form-label">
            Número *
          </label>
          <input
            id="numero"
            {...register('numero', { required: 'Número é obrigatório' })}
            placeholder="123"
            className={`checkout-form-input ${errors.numero ? 'error' : ''}`}
            disabled={isLoading}
          />
          {errors.numero && (
            <span className="checkout-form-error">
              <AlertCircle size={16} />
              {errors.numero.message}
            </span>
          )}
        </div>

        <div className="checkout-form-group">
          <label htmlFor="complemento" className="checkout-form-label">
            Complemento
          </label>
          <input
            id="complemento"
            {...register('complemento')}
            placeholder="Apto 456 (opcional)"
            className="checkout-form-input"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Cidade e Estado */}
      <div className="checkout-form-row">
        <div className="checkout-form-group">
          <label htmlFor="cidade" className="checkout-form-label">
            Cidade *
          </label>
          <input
            id="cidade"
            {...register('cidade', { required: 'Cidade é obrigatória' })}
            placeholder="São Paulo"
            className={`checkout-form-input ${errors.cidade ? 'error' : ''}`}
            disabled={isLoading || carregando}
          />
          {errors.cidade && (
            <span className="checkout-form-error">
              <AlertCircle size={16} />
              {errors.cidade.message}
            </span>
          )}
        </div>

        <div className="checkout-form-group">
          <label htmlFor="estado" className="checkout-form-label">
            Estado *
          </label>
          <input
            id="estado"
            {...register('estado', { 
              required: 'Estado é obrigatório',
              maxLength: { value: 2, message: 'Use apenas 2 caracteres' }
            })}
            placeholder="SP"
            className={`checkout-form-input ${errors.estado ? 'error' : ''}`}
            disabled={isLoading || carregando}
            maxLength={2}
            style={{ textTransform: 'uppercase' }}
          />
          {errors.estado && (
            <span className="checkout-form-error">
              <AlertCircle size={16} />
              {errors.estado.message}
            </span>
          )}
        </div>
      </div>

      {/* Botão Submit */}
      <button 
        type="submit" 
        className="checkout-button primary"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader size={20} className="animate-spin" />
            Processando...
          </>
        ) : (
          'Continuar para Pagamento'
        )}
      </button>
    </form>
  );
}
