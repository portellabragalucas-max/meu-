/**
 * Root Page - Redireciona para Login ou Dashboard
 */

import { redirect } from 'next/navigation';

export default function Home() {
  // Em produção, verificaria se o usuário está autenticado
  // Por enquanto, redireciona para o dashboard
  // Para testar a página de login, mude para '/login'
  redirect('/dashboard');
}
