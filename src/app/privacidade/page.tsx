import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade — Criativo Pronto',
  description: 'Saiba como a Criativo Pronto coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.',
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen" style={{ background: '#06060a', color: '#ccc', fontFamily: "'Inter', sans-serif" }}>
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-white">
            ⚡ <span style={{ color: '#ff6b35' }}>Criativo</span> Pronto
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-white transition-colors">← Voltar</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Política de Privacidade</h1>
        <p className="text-sm text-gray-600 mb-12">Última atualização: março de 2026 — Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</p>

        <div className="space-y-10 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Controlador dos Dados</h2>
            <p>A Criativo Pronto é a controladora dos dados pessoais coletados nesta plataforma, operada por:<br />
            <strong className="text-white">LB Serviços Digitais e Entretenimento Ltda</strong><br />
            CNPJ: 53.664.749/0001-08<br />
            Encarregado de Dados (DPO): <a href="mailto:contato@criativopronto.com.br" className="text-orange-400 hover:text-orange-300">contato@criativopronto.com.br</a></p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Dados que Coletamos</h2>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              <li><strong className="text-gray-300">Dados de cadastro:</strong> nome, e-mail, senha (armazenada com hash), tipo de conta (lojista/fabricante).</li>
              <li><strong className="text-gray-300">Dados de perfil:</strong> nome da loja/empresa, telefone, website, cidade, logo e imagens de marca.</li>
              <li><strong className="text-gray-300">Dados de uso:</strong> produtos acessados, artes geradas, templates utilizados, histórico de downloads.</li>
              <li><strong className="text-gray-300">Dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional, logs de acesso.</li>
              <li><strong className="text-gray-300">Dados de pagamento:</strong> processados por gateway terceiro (Stripe/Mercado Pago). Não armazenamos dados de cartão.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Finalidade do Uso dos Dados</h2>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              <li>Prestação do serviço: geração de artes personalizadas com sua marca.</li>
              <li>Gestão de conta e autenticação.</li>
              <li>Comunicações sobre o serviço (atualizações, alertas de limite de uso).</li>
              <li>Melhoria da plataforma com base em padrões de uso agregados.</li>
              <li>Cumprimento de obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Base Legal (LGPD)</h2>
            <p className="mb-2">Processamos seus dados com base nas seguintes hipóteses legais previstas na LGPD:</p>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              <li><strong className="text-gray-300">Execução de contrato</strong> (Art. 7º, V): dados necessários para prestar o serviço contratado.</li>
              <li><strong className="text-gray-300">Consentimento</strong> (Art. 7º, I): para comunicações de marketing opcionais.</li>
              <li><strong className="text-gray-300">Legítimo interesse</strong> (Art. 7º, IX): melhoria do serviço e segurança da plataforma.</li>
              <li><strong className="text-gray-300">Cumprimento de obrigação legal</strong> (Art. 7º, II): quando exigido por lei.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Compartilhamento de Dados</h2>
            <p className="mb-2">Não vendemos seus dados pessoais. Compartilhamos apenas com:</p>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              <li><strong className="text-gray-300">Processadores de infraestrutura:</strong> banco de dados e autenticação (servidores seguros).</li>
              <li><strong className="text-gray-300">Hospedagem:</strong> serviço de hospedagem da aplicação.</li>
              <li><strong className="text-gray-300">APIs de geração de conteúdo:</strong> processamento de artes e textos via tecnologia proprietária.</li>
              <li><strong className="text-gray-300">Gateway de pagamento:</strong> processamento de assinaturas.</li>
              <li><strong className="text-gray-300">Autoridades competentes:</strong> quando exigido por lei ou ordem judicial.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Cookies e Tecnologias Similares</h2>
            <p>Utilizamos cookies essenciais para autenticação e funcionamento da plataforma. Não utilizamos cookies de rastreamento de terceiros para publicidade.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Seus Direitos (Art. 18 da LGPD)</h2>
            <p className="mb-2">Você tem os seguintes direitos sobre seus dados pessoais:</p>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              <li><strong className="text-gray-300">Acesso:</strong> solicitar cópia dos dados que temos sobre você.</li>
              <li><strong className="text-gray-300">Correção:</strong> atualizar dados incorretos ou incompletos.</li>
              <li><strong className="text-gray-300">Exclusão:</strong> solicitar a exclusão de seus dados (exceto quando há obrigação legal de retenção).</li>
              <li><strong className="text-gray-300">Portabilidade:</strong> receber seus dados em formato estruturado.</li>
              <li><strong className="text-gray-300">Revogação de consentimento:</strong> para dados processados com base em consentimento.</li>
              <li><strong className="text-gray-300">Oposição:</strong> opor-se ao tratamento quando baseado em legítimo interesse.</li>
            </ul>
            <p className="mt-3">Para exercer esses direitos: <a href="mailto:contato@criativopronto.com.br" className="text-orange-400 hover:text-orange-300">contato@criativopronto.com.br</a></p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Retenção e Exclusão de Dados</h2>
            <p>Mantemos seus dados enquanto sua conta estiver ativa. Após o encerramento da conta, os dados são excluídos em até 90 dias, salvo obrigações legais que exijam retenção por período maior.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Segurança dos Dados</h2>
            <p>Utilizamos criptografia em trânsito (TLS/HTTPS) e em repouso, controle de acesso por função (RLS no banco de dados), e monitoramento de segurança contínuo. Em caso de incidente de segurança, notificaremos os usuários afetados e a ANPD conforme exigido pela LGPD.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Alterações nesta Política</h2>
            <p>Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas por e-mail ou notificação na plataforma.</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/5 px-6 py-6 text-center text-xs text-gray-700">
        <span className="mr-4">LB Serviços Digitais e Entretenimento Ltda — CNPJ 53.664.749/0001-08</span>
        <Link href="/termos" className="hover:text-gray-500 transition-colors mr-6">Termos de Serviço</Link>
        <Link href="/" className="hover:text-gray-500 transition-colors">Voltar ao início</Link>
      </footer>
    </div>
  );
}
