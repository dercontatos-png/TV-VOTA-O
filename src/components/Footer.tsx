import { useState } from 'react';
import { Share2, Check, ShieldAlert, Key } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: 'voting' | 'admin') => void;
  isAdmin: boolean;
  onLogin: () => void;
}

export default function Footer({ onNavigate, isAdmin, onLogin }: FooterProps) {
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
    <footer className="bg-slate-900 text-slate-400 py-12 px-4 mt-auto border-t border-slate-800" id="app-footer">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <h2 className="text-white font-bold text-lg tracking-tight">Morro do Chapéu BA</h2>
          <p className="text-sm text-slate-500 mt-1">
            Plataforma oficial de votação para o Melhor Prata da Casa das equipes finalistas.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            id="share-link-btn"
            onClick={handleShare}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all duration-200 shadow-sm cursor-pointer"
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

          {isAdmin && (
            <button
              id="footer-admin-link"
              onClick={() => onNavigate('admin')}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800 px-3.5 py-2 rounded-lg transition-colors cursor-pointer border border-blue-500/20 bg-blue-950/20"
            >
              <Key className="w-3.5 h-3.5 text-blue-400" />
              <span>Acessar Painel</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Footer copyright area */}
      <div className="max-w-6xl mx-auto border-t border-slate-800/60 mt-8 pt-6 flex justify-center items-center text-xs text-slate-600 gap-4">
        <div>
          &copy; {new Date().getFullYear()} Campeonato de Morro do Chapéu. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
