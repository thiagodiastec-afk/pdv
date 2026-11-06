import React, { useState } from 'react';
import {
  Download,
  Monitor,
  CheckCircle2,
  Sparkles,
  X,
  HardDriveDownload,
  ShieldCheck,
  Laptop,
  Play,
  FileCode,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface DesktopInstallerModalProps {
  onClose: () => void;
}

export const DesktopInstallerModal: React.FC<DesktopInstallerModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [downloadedItem, setDownloadedItem] = useState<'EXE' | 'BAT' | 'PORTABLE' | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#1b272c] border border-white/10 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#141e22] border-b border-white/10">
          <div className="flex items-center gap-3">
            <HardDriveDownload className="w-5 h-5 text-[#00c885]" />
            <div>
              <h2 className="text-base font-bold text-white">
                Instalador Executável Windows (.EXE) — CromaPDV Fiscal
              </h2>
              <p className="text-xs text-slate-400">
                Instalador gráfico completo para usuário leigo (sem necessidade de Node.js ou internet)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {downloadedItem && (
            <div className="px-4 py-3.5 bg-[#00c885]/15 border border-[#00c885] rounded-lg text-xs text-emerald-100 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#00c885] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-white">
                  {downloadedItem === 'EXE'
                    ? 'Instalador Executável (Instalador_CromaPDV_Fiscal_Setup.exe) baixado!'
                    : downloadedItem === 'BAT'
                    ? 'Assistente Setup_CromaPDV_Windows.bat baixado!'
                    : 'Aplicativo Portátil Autocontido baixado!'}
                </div>
                {downloadedItem === 'EXE' || downloadedItem === 'BAT' ? (
                  <p className="text-slate-200 leading-relaxed">
                    1. Abra o arquivo baixado na sua pasta de <strong>Downloads</strong>.<br />
                    2. Se o Windows exibir a tela azul do SmartScreen (por ser um executável novo sem
                    assinatura EV Microsoft), clique em <strong>&ldquo;Mais informações&rdquo;</strong> e depois no
                    botão <strong>&ldquo;Executar assim mesmo&rdquo;</strong>.<br />
                    3. Na janela gráfica do instalador, clique em <strong>&ldquo;INSTALAR AGORA&rdquo;</strong>!
                  </p>
                ) : (
                  <p className="text-slate-200 leading-relaxed">
                    Dê <strong>dois cliques</strong> no arquivo{' '}
                    <strong>CromaPDV_Portatil.html</strong> e o PDV completo abrirá imediatamente!
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Option 1: Native 64-bit Windows Setup .EXE */}
          <div className="bg-[#141e22] border-2 border-[#00c885] rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-[#00c885]/15 text-[#00c885] shrink-0">
                <Monitor className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-[#00c885] uppercase tracking-wider">
                  Instalador Executável Nativo para Windows 10 e 11 (64-bit .EXE)
                </div>
                <h3 className="text-base font-bold text-white">
                  1. Instalador_CromaPDV_Fiscal_Setup.exe (Assistente Gráfico)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Executável <strong>.EXE</strong> com janela gráfica de instalação. Instala o
                  executável <strong>CromaPDV_Fiscal.exe</strong>, o ícone personalizado{' '}
                  <strong>CromaPDV.ico</strong> e o banco de dados local na máquina do cliente,
                  criando o atalho na Área de Trabalho e no Menu Iniciar.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] text-slate-300">
              <div className="bg-[#1b272c] px-3 py-2 rounded-lg border border-white/10 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00c885] shrink-0" />
                <span>Instala CromaPDV_Fiscal.exe</span>
              </div>
              <div className="bg-[#1b272c] px-3 py-2 rounded-lg border border-white/10 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00c885] shrink-0" />
                <span>Ícone próprio na Área de Trabalho</span>
              </div>
              <div className="bg-[#1b272c] px-3 py-2 rounded-lg border border-white/10 flex items-center gap-2">
                <Play className="w-4 h-4 text-[#00c885] shrink-0" />
                <span>Roda 100% Offline no PC</span>
              </div>
            </div>

            <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
              <a
                href="/instalador/Instalador_CromaPDV_Fiscal_Setup.exe?v=2.7"
                download="Instalador_CromaPDV_Fiscal_Setup.exe"
                onClick={() => setDownloadedItem('EXE')}
                className="flex-1 py-3.5 px-5 bg-[#00c885] hover:bg-[#00b377] text-slate-950 font-bold text-sm rounded-lg flex items-center justify-center gap-2.5 transition-all shadow-[0_0_20px_rgba(0,200,133,0.3)] cursor-pointer no-underline text-center"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>BAIXAR INSTALADOR EXECUTÁVEL (.EXE)</span>
              </a>

              <a
                href="/instalador/Setup_CromaPDV_Windows.bat?v=2.6"
                download="Setup_CromaPDV_Windows.bat"
                onClick={() => setDownloadedItem('BAT')}
                className="py-3.5 px-4 bg-[#25333a] hover:bg-[#31444d] text-slate-200 font-semibold text-xs rounded-lg border border-white/15 flex items-center justify-center gap-2 transition-colors cursor-pointer no-underline shrink-0"
                title="Alternativa caso o antivírus da rede bloqueie download de arquivos .exe"
              >
                <FileCode className="w-4 h-4 text-[#00c885]" />
                <span>Alternativa (.BAT)</span>
              </a>
            </div>
          </div>

          {/* Option 2: Zero-Install Portable Single-File Executable */}
          <div className="bg-[#141e22] border border-white/15 rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-white/5 text-slate-200 shrink-0">
                <Laptop className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-bold text-white">
                  2. Versão Portátil Direta (Abre com 2 Cliques Sem Instalar — Windows, Mac ou Linux)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ideal caso o navegador ou antivírus bloqueie arquivos `.exe` baixados da internet:
                  este arquivo único já contém todo o sistema e fotos embutidas e abre direto com
                  dois cliques.
                </p>
                <div className="pt-2">
                  <a
                    href="/instalador/CromaPDV_Portatil.html?v=2.6"
                    download="CromaPDV_Portatil.html"
                    onClick={() => setDownloadedItem('PORTABLE')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25333a] hover:bg-[#31444d] text-white font-semibold text-xs rounded-lg border border-white/15 transition-colors cursor-pointer no-underline"
                  >
                    <Download className="w-4 h-4 text-[#00c885]" />
                    Baixar Versão Portátil (CromaPDV_Portatil.html)
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Option 3: Direct Browser PWA Install if available */}
          {(isInstallable || isInstalled) && (
            <div className="bg-[#141e22] border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#00c885] shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-white">Instalação Direta via Navegador (PWA)</div>
                  <div className="text-slate-400">
                    Instala diretamente pelo navegador atual com funcionamento offline
                  </div>
                </div>
              </div>
              {isInstalled ? (
                <span className="text-xs font-semibold text-[#00c885] shrink-0">Já Instalado</span>
              ) : (
                <button
                  type="button"
                  onClick={install}
                  className="px-3.5 py-2 bg-[#00c885]/20 hover:bg-[#00c885]/30 text-[#00c885] border border-[#00c885]/40 font-bold text-xs rounded-lg shrink-0 cursor-pointer"
                >
                  Instalar via PWA
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#141e22] border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
