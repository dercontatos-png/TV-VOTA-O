import { useState } from 'react';
import { Share2, Check, Lock, ShieldAlert } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: 'voting' | 'admin') => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-4 mt-auto border-t border-gray-800" id="app-footer">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <h2 className="text-white font-bold text-lg tracking-tight">Morro do Chapéu BA</h2>
          <p className="text-sm text-gray-500 mt-1">
            Plataforma oficial de votação para o Melhor Prata da Casa das equipes finalistas.
          </p>
          <div className="flex items-center gap-2 mt-3 text-xs justify-center md:justify-start text-emerald-500 bg-emerald-950/40 px-3 py-1.5 rounded-full w-fit">
            <ShieldAlert className="w-4.5 h-4.5" />
            <span>Limite de 1 voto por jogador, uma vez por dia por dispositivo.</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            id="share-link-btn"
            onClick={handleShare}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all duration-200 shadow-sm cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Link Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Compartilhar Votação</span>
              </>
            )}
          </button>

          <button
            id="footer-admin-link"
            onClick={() => onNavigate('admin')}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white hover:bg-gray-800 px-3.5 py-2 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-gray-700"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Acesso Administrativo</span>
          </button>
        </div>
      </div>
      <div className="max-w-6xl mx-auto border-t border-gray-800/60 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-600 gap-4">
        <div>
          &copy; {new Date().getFullYear()} Campeonato de Morro do Chapéu. Todos os direitos reservados.
        </div>
        <div className="flex items-center gap-2">
          <span>Serviço Gratuito de Alta Disponibilidade</span>
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
        </div>
      </div>
    </footer>
  );
}
