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
    <footer className="bg-slate-900 text-slate-400 py-12 px-4 mt-auto border-t border-slate-800 print:hidden" id="app-footer">
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
                <span>Convidar Amigos para Votar</span>
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
      
      {/* TV Chapada Social Links */}
      <div className="max-w-6xl mx-auto flex justify-center mt-8 pt-6 border-t border-slate-800/60">
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Siga a TV Chapada</span>
          <div className="flex items-center gap-4">
            <a href="https://www.instagram.com/tvchapada/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              <span className="text-xs font-bold">Instagram</span>
            </a>
            <a href="https://www.youtube.com/@tvchapada" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-500"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
              <span className="text-xs font-bold">YouTube (Assista a Final!)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Footer copyright area */}
      <div className="max-w-6xl mx-auto border-t border-slate-800/60 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
        <div className="text-center md:text-left">
          &copy; {new Date().getFullYear()} Votação Oficial do Campeonato. Todos os direitos reservados.
        </div>
        <div className="text-center font-bold text-slate-400">
          Criado por Ricardo Silva
        </div>
      </div>
    </footer>
  );
}
