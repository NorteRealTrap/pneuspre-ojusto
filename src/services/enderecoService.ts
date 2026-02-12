import { supabase } from './supabase';

/**
 * Interface para dados de endereço
 */
export interface Endereco {
  id?: string;
  usuario_id: string;
  nome_completo: string;
  rua: string;
  numero: string;
  complemento?: string;
  cidade: string;
  estado: string;
  cep: string;
  verificado: boolean;
  endereco_padrao?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface para resposta de endereço
 */
export interface EnderecoResponse extends Endereco {
  id: string;
  created_at: string;
}

/**
 * Salvar novo endereço do usuário
 */
export async function salvarEndereco(endereco: Omit<Endereco, 'id' | 'created_at' | 'updated_at'>): Promise<EnderecoResponse> {
  const { data, error } = await supabase
    .from('enderecos')
    .insert([{
      usuario_id: endereco.usuario_id,
      nome_completo: endereco.nome_completo,
      rua: endereco.rua,
      numero: endereco.numero,
      complemento: endereco.complemento || null,
      cidade: endereco.cidade,
      estado: endereco.estado.toUpperCase(),
      cep: endereco.cep.replace(/\D/g, ''),
      verificado: endereco.verificado ?? true,
      endereco_padrao: endereco.endereco_padrao ?? false
    }])
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar endereço:', error);
    throw new Error(`Erro ao salvar endereço: ${error.message}`);
  }

  return data as EnderecoResponse;
}

/**
 * Obter todos os endereços do usuário
 */
export async function obterEnderecos(usuarioId: string): Promise<EnderecoResponse[]> {
  const { data, error } = await supabase
    .from('enderecos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('endereco_padrao', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao obter endereços:', error);
    throw new Error(`Erro ao obter endereços: ${error.message}`);
  }

  return data as EnderecoResponse[];
}

/**
 * Obter endereço por ID
 */
export async function obterEnderecoPorId(id: string): Promise<EnderecoResponse> {
  const { data, error } = await supabase
    .from('enderecos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao obter endereço:', error);
    throw new Error(`Erro ao obter endereço: ${error.message}`);
  }

  return data as EnderecoResponse;
}

/**
 * Atualizar endereço
 */
export async function atualizarEndereco(id: string, updates: Partial<Endereco>): Promise<EnderecoResponse> {
  const { data, error } = await supabase
    .from('enderecos')
    .update({
      nome_completo: updates.nome_completo,
      rua: updates.rua,
      numero: updates.numero,
      complemento: updates.complemento || null,
      cidade: updates.cidade,
      estado: updates.estado?.toUpperCase(),
      cep: updates.cep?.replace(/\D/g, ''),
      verificado: updates.verificado,
      endereco_padrao: updates.endereco_padrao,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar endereço:', error);
    throw new Error(`Erro ao atualizar endereço: ${error.message}`);
  }

  return data as EnderecoResponse;
}

/**
 * Deletar endereço
 */
export async function deletarEndereco(id: string): Promise<void> {
  const { error } = await supabase
    .from('enderecos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar endereço:', error);
    throw new Error(`Erro ao deletar endereço: ${error.message}`);
  }
}

/**
 * Definir endereço como padrão
 */
export async function definirEnderecoPadrao(usuarioId: string, enderecoId: string): Promise<void> {
  // Remove o padrão anterior
  const { error: updateError } = await supabase
    .from('enderecos')
    .update({ endereco_padrao: false })
    .eq('usuario_id', usuarioId);

  if (updateError) {
    console.error('Erro ao remover endereço padrão anterior:', updateError);
    throw new Error(`Erro ao remover endereço padrão anterior: ${updateError.message}`);
  }

  // Define o novo padrão
  const { error } = await supabase
    .from('enderecos')
    .update({ endereco_padrao: true })
    .eq('id', enderecoId)
    .eq('usuario_id', usuarioId);

  if (error) {
    console.error('Erro ao definir endereço padrão:', error);
    throw new Error(`Erro ao definir endereço padrão: ${error.message}`);
  }
}

/**
 * Obter endereço padrão do usuário
 */
export async function obterEnderecoPadrao(usuarioId: string): Promise<EnderecoResponse | null> {
  const { data, error } = await supabase
    .from('enderecos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('endereco_padrao', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao obter endereço padrão:', error);
    throw new Error(`Erro ao obter endereço padrão: ${error.message}`);
  }

  return (data as EnderecoResponse) || null;
}

/**
 * Formatar endereço para exibição
 */
export function formatarEndereco(endereco: EnderecoResponse): string {
  const complementoStr = endereco.complemento ? `, ${endereco.complemento}` : '';
  return `${endereco.rua}, ${endereco.numero}${complementoStr} - ${endereco.cidade}, ${endereco.estado} ${endereco.cep}`;
}

/**
 * Validar formato de CEP
 */
export function validarCep(cep: string): boolean {
  const cepLimpo = cep.replace(/\D/g, '');
  return cepLimpo.length === 8;
}

/**
 * Formatar CEP para exibição (12345-678)
 */
export function formatarCepExibicao(cep: string): string {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) return cep;
  return `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`;
}
