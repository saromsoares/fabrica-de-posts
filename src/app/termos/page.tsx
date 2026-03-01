import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Serviço — Fábrica de Posts',
  description: 'Leia os Termos de Serviço da plataforma Fábrica de Posts.',
};

export default function TermosPage() {
  return (
    <div className="min-h-screen" style={{ background: '#06060a', color: '#ccc', fontFamily: "'Inter', sans-serif" }}>
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-white">
            ⚡ <span style={{ color: '#ff6b35' }}>Fábrica</span> de Posts
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-white transition-colors">← Voltar</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Termos de Serviço</h1>
        <p className="text-sm text-gray-600 mb-12">Última atualização: março de 2026</p>

        <div className="space-y-10 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Aceitação dos Termos</h2>
            <p>Ao acessar ou utilizar a plataforma Fábrica de Posts, você concorda com estes Termos de Serviço. Se não concordar com qualquer parte destes termos, não utilize a plataforma.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Descrição do Serviço</h2>
            <p>A Fábrica de Posts é uma plataforma SaaS que permite a lojistas e revendedores gerar artes e textos profissionais para redes sociais, utilizando catálogos de produtos fornecidos por fabricantes parceiros. O serviço é disponibilizado mediante assinatura de planos mensais, com opção de plano gratuito com funcionalidades limitadas.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Cadastro e Conta</h2>
            <p className="mb-2">Para utilizar a plataforma, você deve criar uma conta fornecendo informações verdadeiras e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.</p>
            <p>Reservamo-nos o direito de encerrar contas que violem estes termos ou que apresentem atividades suspeitas.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Planos e Pagamentos</h2>
            <p className="mb-2">Os planos pagos são cobrados mensalmente. O cancelamento pode ser realizado a qualquer momento, sem multa ou fidelidade, e o acesso continua disponível até o fim do período já pago.</p>
            <p>Os preços podem ser alterados com aviso prévio de 30 dias. Não realizamos reembolsos por períodos parcialmente utilizados, salvo em casos previstos pelo Código de Defesa do Consumidor.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Propriedade Intelectual</h2>
            <p className="mb-2">O conteúdo gerado pela plataforma (artes e textos) pode ser utilizado livremente pelo usuário para fins comerciais em suas redes sociais. Os templates e a tecnologia da plataforma são de propriedade exclusiva da Fábrica de Posts.</p>
            <p>Ao cadastrar imagens e logotipos, você declara possuir os direitos necessários sobre esses materiais e nos concede licença para processá-los dentro da plataforma.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Uso Aceitável</h2>
            <p>É proibido utilizar a plataforma para gerar conteúdo ilegal, difamatório, enganoso ou que viole direitos de terceiros. Também é proibido tentar burlar os limites dos planos, realizar engenharia reversa da plataforma ou compartilhar credenciais de acesso.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Limitação de Responsabilidade</h2>
            <p>A plataforma é fornecida &ldquo;como está&rdquo;. Não garantimos disponibilidade ininterrupta do serviço. Nossa responsabilidade é limitada ao valor pago pelo usuário nos últimos 30 dias.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Alterações nos Termos</h2>
            <p>Podemos atualizar estes termos periodicamente. Notificaremos os usuários sobre mudanças significativas por e-mail ou notificação na plataforma. O uso continuado após as alterações implica na aceitação dos novos termos.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Contato</h2>
            <p>Para dúvidas sobre estes termos, entre em contato: <a href="mailto:contato@fabricadeposts.com.br" className="text-orange-400 hover:text-orange-300">contato@fabricadeposts.com.br</a></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/5 px-6 py-6 text-center text-xs text-gray-700">
        <Link href="/privacidade" className="hover:text-gray-500 transition-colors mr-6">Política de Privacidade</Link>
        <Link href="/" className="hover:text-gray-500 transition-colors">Voltar ao início</Link>
      </footer>
    </div>
  );
}
