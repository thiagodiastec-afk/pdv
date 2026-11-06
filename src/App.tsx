/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Clock,
  ChevronDown,
  Plus,
  Minus,
  Trash2,
  Barcode,
  HelpCircle,
  X,
  UserCheck,
  Percent,
  Download,
} from 'lucide-react';
import {
  Product,
  CategoryId,
  CartItem,
  FiscalInvoice,
  CashMovement,
  PaymentMethod,
  INITIAL_PRODUCTS,
  INITIAL_CART,
  INITIAL_INVOICES,
  INITIAL_MOVEMENTS,
  INITIAL_STORE_CONFIG,
  formatBRL,
  formatCpfCnpj,
  generateChaveAcesso,
  generateProtocoloSefaz,
} from './data/posData';
import { CheckoutModal } from './components/CheckoutModal';
import { DanfeModal } from './components/DanfeModal';
import { CashMovementModal } from './components/CashMovementModal';
import { InvoicesHistoryView } from './components/InvoicesHistoryView';
import { CatalogFiscalView } from './components/CatalogFiscalView';
import { FiscalConfigView } from './components/FiscalConfigView';
import { SalesHistory } from './components/SalesHistory';
import { BusinessSetup, type Business } from './components/BusinessSetup';
import { DesktopInstallerModal } from './components/DesktopInstallerModal';

type ActiveWorkspace = 'POS' | 'SALES' | 'NFCE_HISTORY' | 'CATALOG' | 'CONFIG_FISCAL';

type Snapshot = {
  business?: Business;
  registerOpen?: boolean;
  products: Product[];
  cart: CartItem[];
  invoices: FiscalInvoice[];
  movements: CashMovement[];
  storeConfig: typeof INITIAL_STORE_CONFIG;
};

const SNAPSHOT_KEY = 'cromapdv_snapshot_v1';

function readLegacy<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function readSnapshot(): Snapshot & { saved: string | null } {
  try {
    const saved = localStorage.getItem(SNAPSHOT_KEY);
    if (saved) return { ...JSON.parse(saved), saved };
  } catch {
    // Legacy values remain available if the snapshot could not be read.
  }
  return {
    saved: null,
    products: readLegacy('cromapdv_products_v1', INITIAL_PRODUCTS),
    cart: readLegacy('cromapdv_cart_v1', INITIAL_CART),
    invoices: readLegacy('cromapdv_invoices_v1', INITIAL_INVOICES),
    movements: readLegacy('cromapdv_movements_v1', INITIAL_MOVEMENTS),
    storeConfig: { ...INITIAL_STORE_CONFIG, ...readLegacy('cromapdv_store_config_v2', {}) },
  };
}

export default function App() {
  const [snapshot, setSnapshot] = useState(readSnapshot);
  const snapshotRef = useRef(snapshot);
  const { products, invoices, movements, storeConfig, cart, business } = snapshot;
  const [showBusinessSetup, setShowBusinessSetup] = useState(false);
  const profile = business?.profile ?? 'mixed';
  const availableProducts = products.filter(product =>
    profile === 'mixed' || (profile === 'services' ? product.kind === 'service' : product.kind !== 'service')
  );

  const [workspace, setWorkspace] = useState<ActiveWorkspace>('POS');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('Bebidas');
  const [useReferenceSixGrid, setUseReferenceSixGrid] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [customerCpf, setCustomerCpf] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const isRegisterOpen = snapshot.registerOpen ?? true;

  // Modals state
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [activeDanfeInvoice, setActiveDanfeInvoice] = useState<FiscalInvoice | null>(null);
  const [showCashModal, setShowCashModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showDiscountModal, setShowDiscountModal] = useState<boolean>(false);
  const [showCpfModal, setShowCpfModal] = useState<boolean>(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState<boolean>(false);
  const showInstallOptions =
    window.location.protocol !== 'file:' &&
    !window.matchMedia('(display-mode: standalone)').matches &&
    (navigator as Navigator & { standalone?: boolean }).standalone !== true;
  const [showInstallerModal, setShowInstallerModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Clock state
  const [clockText, setClockText] = useState<{ date: string; time: string }>({
    date: '05/11/2026',
    time: '15:00',
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const d = now.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const t = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setClockText({ date: d, time: t });
    };
    updateClock();
    const timer = setInterval(updateClock, 15000);
    return () => clearInterval(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  async function saveSnapshot(update: (current: Snapshot) => Snapshot) {
    try {
      return await navigator.locks.request(SNAPSHOT_KEY, () => {
        const stored = localStorage.getItem(SNAPSHOT_KEY);
        const current = snapshotRef.current;
        if (stored !== current.saved) {
          const latest = readSnapshot();
          snapshotRef.current = latest;
          setSnapshot(latest);
          triggerToast('Dados atualizados em outra aba. Confira e repita a operação.');
          return false;
        }
        const next = update(current);
        const saved = JSON.stringify({ ...next, saved: undefined });
        localStorage.setItem(SNAPSHOT_KEY, saved);
        const committed = { ...next, saved };
        snapshotRef.current = committed;
        setSnapshot(committed);
        return true;
      });
    } catch {
      triggerToast('Não foi possível salvar os dados. Tente novamente em uma aba segura.');
      return false;
    }
  }

  function setField<K extends keyof Snapshot>(key: K) {
    return (update: React.SetStateAction<Snapshot[K]>) => {
      return saveSnapshot((current) => ({
        ...current,
        [key]: typeof update === 'function'
          ? (update as (previous: Snapshot[K]) => Snapshot[K])(current[key])
          : update,
      }));
    };
  }

  const setProducts = setField('products');
  const setCart = setField('cart');
  const setInvoices = setField('invoices');
  const setMovements = setField('movements');
  const setStoreConfig = setField('storeConfig');

  async function saveBusiness(nextBusiness: Business, demo: boolean) {
    if ((business || snapshot.saved !== null) && cart.some(({ product }) =>
      (nextBusiness.profile === 'retail' && product.kind === 'service') ||
      (nextBusiness.profile === 'services' && product.kind !== 'service')
    )) {
      triggerToast('Esvazie o carrinho antes de mudar para este perfil.');
      return false;
    }
    const saved = await saveSnapshot(current => {
      const hasExistingData = snapshot.saved !== null ||
        ['products_v1', 'cart_v1', 'invoices_v1', 'movements_v1', 'store_config_v2']
          .some(key => localStorage.getItem('cromapdv_' + key) !== null);
      if (hasExistingData || demo) return {
        ...current,
        business: nextBusiness,
        cart: !hasExistingData && nextBusiness.profile === 'services' ? [] : current.cart,
      };
      return {
        ...current,
        business: nextBusiness,
        registerOpen: false,
        products: [],
        cart: [],
        invoices: [],
        movements: [],
        storeConfig: {
          ...current.storeConfig,
          nomeFantasia: nextBusiness.name,
          razaoSocial: nextBusiness.name,
          cnpj: '',
          inscricaoEstadual: '',
          endereco: '',
          cidadeUf: '',
          cep: '',
          codigoIbgeMunicipio: '',
          cscId: '',
          cscToken: '',
          certificadoArquivoNome: '',
          certificadoEmissor: '',
          certificadoValidade: '',
          certificadoStatus: 'PENDENTE',
          proximoNumeroNfce: 1,
        },
      };
    });
    if (saved) setShowBusinessSetup(false);
    return saved;
  }

  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const effectiveDiscount = Math.min(discount, subtotal);
  const total = Math.round(Math.max(0, subtotal - effectiveDiscount) * 100) / 100;

  const addToCart = async (product: Product, qty = 1) => {
    if (!isRegisterOpen) {
      triggerToast('Caixa fechado! Reabra o caixa (F7) para registrar vendas.');
      return;
    }
    const available = products.find((item) => item.id === product.id)?.stock ?? 0;
    if ((cart.find((item) => item.product.id === product.id)?.quantity ?? 0) + qty > available && product.kind !== 'service') {
      triggerToast("Estoque insuficiente.");
      return;
    }
    return await setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + qty,
        };
        return updated;
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    const item = cart.find((entry) => entry.product.id === productId);
    const available = products.find((product) => product.id === productId)?.stock ?? 0;
    if (delta > 0 && item && item.product.kind !== 'service' && item.quantity + delta > available) {
      triggerToast("Estoque insuficiente.");
      return;
    }
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCustomerCpf('');
    setCustomerName('');
    setShowCancelConfirmModal(false);
    triggerToast('Cupom atual cancelado.');
  };

  // Global POS keyboard shortcuts (F1, F2, F3, F4, F6, F7, F8, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!business || showBusinessSetup) return;
      if (e.key === 'F1') {
        e.preventDefault();
        setShowHelpModal((v) => !v);
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (business && !showBusinessSetup && workspace === 'POS' && cart.length > 0) {
          setShowCheckoutModal(true);
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        setWorkspace('POS');
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          setShowDiscountModal(true);
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        setShowCpfModal(true);
      } else if (e.key === 'F7') {
        e.preventDefault();
        setShowCashModal(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) {
          setShowCancelConfirmModal(true);
        }
      } else if (e.key === 'F9' && showInstallOptions) {
        e.preventDefault();
        setShowInstallerModal(true);
      } else if (e.key === 'Escape') {
        setShowCheckoutModal(false);
        setActiveDanfeInvoice(null);
        setShowCashModal(false);
        setShowHelpModal(false);
        setShowDiscountModal(false);
        setShowCpfModal(false);
        setShowCancelConfirmModal(false);
        setShowInstallerModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workspace, cart.length, showInstallOptions, business, showBusinessSetup]);

  // Barcode / Quick Search Enter handler (supports "3*1001" or "7891000010013" or product name)
  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const raw = searchQuery.trim();
      let qty = 1;
      let term = raw;

      if (raw.includes('*')) {
        const parts = raw.split('*');
        const parsedQty = parseInt(parts[0], 10);
        if (!isNaN(parsedQty) && parsedQty > 0) {
          qty = parsedQty;
          term = parts.slice(1).join('*').trim();
        }
      }

      const exactMatch = availableProducts.find(
        (p) =>
          p.barcode === term ||
          p.code === term ||
          p.name.toLowerCase() === term.toLowerCase()
      );

      const partialMatch =
        exactMatch ||
        availableProducts.find(
          (p) =>
            p.name.toLowerCase().includes(term.toLowerCase()) ||
            p.barcode.includes(term)
        );

      if (partialMatch) {
        if (!(await addToCart(partialMatch, qty))) return;
        setSearchQuery('');
        triggerToast(`+${qty}x ${partialMatch.name} adicionado ao cupom`);
      } else {
        triggerToast(`Nenhum produto encontrado para "${term}"`);
      }
    }
  };

  // Simulate barcode reader beep
  const handleSimulateBarcodeScan = () => {
    const scannable = availableProducts.filter(product => product.kind !== 'service');
    const sample = scannable[Math.floor(Math.random() * scannable.length)];
    if (!sample) {
      triggerToast("Cadastre um produto para simular a leitura.");
      return;
    }
    addToCart(sample, 1);
  };

  // Confirm sale and issue NFC-e
  const handleConfirmSale = async (payload: {
    paymentMethod: PaymentMethod;
    amountTendered: number;
    changeAmount: number;
    customerCpfCnpj: string;
    customerName: string;
    emitirNfce: boolean;
  }) => {
    if (!isRegisterOpen || cart.length === 0) {
      triggerToast("Abra o caixa e adicione produtos para finalizar.");
      return;
    }
    const unavailable = cart.find(({ product, quantity }) =>
      product.kind !== 'service' && quantity > (products.find((entry) => entry.id === product.id)?.stock ?? 0)
    );
    if (unavailable) {
      triggerToast(`Estoque insuficiente: ${unavailable.product.name}.`);
      return;
    }
    const now = new Date();
    const formattedTimestamp = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;
    const numeroNfce = storeConfig.proximoNumeroNfce;
    const chave = generateChaveAcesso(
      storeConfig.cnpj,
      storeConfig.seriePadrao,
      numeroNfce,
      storeConfig.modoContingenciaOffline
    );
    const protocolo = generateProtocoloSefaz();

    const tribFederal = cart.reduce(
      (acc, i) => acc + (i.product.price * i.quantity * i.product.ibptFederalPct) / 100,
      0
    );
    const tribEstadual = cart.reduce(
      (acc, i) => acc + (i.product.price * i.quantity * i.product.ibptStatePct) / 100,
      0
    );

    const newInvoice: FiscalInvoice | null = payload.emitirNfce && cart.every(item => item.product.kind !== 'service') ? {
      id: `inv-${numeroNfce}-${Date.now()}`,
      numero: numeroNfce,
      serie: storeConfig.seriePadrao,
      modelo: '65',
      createdAt: formattedTimestamp,
      operatorName: 'Maurício',
      items: [...cart],
      subtotal,
      discount: effectiveDiscount,
      total,
      paymentMethod: payload.paymentMethod,
      amountTendered: payload.amountTendered,
      changeAmount: payload.changeAmount,
      customerCpfCnpj: payload.customerCpfCnpj || undefined,
      customerName: payload.customerName || undefined,
      chaveAcesso: chave,
      protocolo,
      status: storeConfig.modoContingenciaOffline ? 'CONTINGENCIA' : 'AUTORIZADA',
      ambienteEmissao: storeConfig.ambienteSefaz,
      tribFederal,
      tribEstadual,
    } : null;

    const saleMovement: CashMovement = {
      id: `mov-${Date.now()}`,
      type: 'VENDA',
      amount: total,
      paymentMethod: payload.paymentMethod,
      description: newInvoice ? `Venda com NFC-e simulada #${String(numeroNfce).padStart(6, '0')}` : "Venda sem NFC-e",
      createdAt: formattedTimestamp,
      operatorName: 'Maurício',
      invoiceNumero: newInvoice?.numero,
      items: cart,
      discount: effectiveDiscount,
    };

    const saved = await saveSnapshot((current) => {
      if (snapshotRef.current !== snapshot) throw new Error('Venda alterada durante a finalização');
      return {
        ...current,
        invoices: newInvoice ? [newInvoice, ...invoices] : invoices,
        movements: [saleMovement, ...movements],
        storeConfig: newInvoice
          ? { ...storeConfig, proximoNumeroNfce: numeroNfce + 1 }
          : storeConfig,
        products: products.map((product) => {
          const soldItem = cart.find((item) => item.product.id === product.id);
          return soldItem && product.kind !== 'service' ? { ...product, stock: product.stock - soldItem.quantity } : product;
        }),
        cart: [],
      };
    });
    if (!saved) return;
    setShowCheckoutModal(false);
    setDiscount(0);
    setCustomerCpf('');
    setCustomerName('');
    setActiveDanfeInvoice(newInvoice);
    if (!newInvoice) triggerToast("Venda registrada sem NFC-e.");
  };

  const handleCancelInvoice = async (invoiceId: string, reason: string) => {
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target || target.status !== "AUTORIZADA") return;

    const now = new Date();
    const formattedTimestamp = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;
    const reversal: CashMovement = {
      id: `mov-est-${Date.now()}`,
      type: 'ESTORNO',
      amount: target.total,
      paymentMethod: target.paymentMethod,
      description: `Estorno NFC-e #${String(target.numero).padStart(6, '0')} (${reason})`,
      createdAt: formattedTimestamp,
      operatorName: 'Maurício',
      invoiceNumero: target.numero,
    };
    const saved = await saveSnapshot((current) => {
      if (snapshotRef.current !== snapshot) throw new Error('Nota alterada durante o cancelamento');
      return {
        ...current,
        invoices: invoices.map((invoice) => invoice.id === invoiceId
          ? { ...invoice, status: 'CANCELADA', cancelReason: reason }
          : invoice),
        movements: [reversal, ...movements],
        products: products.map((product) => {
          const returned = target.items.find((item) => item.product.id === product.id);
          return returned ? { ...product, stock: product.stock + returned.quantity } : product;
        }),
      };
    });
    if (!saved) return;

    setActiveDanfeInvoice((prev) =>
      prev && prev.id === invoiceId
        ? { ...prev, status: 'CANCELADA', cancelReason: reason }
        : prev
    );
    triggerToast(`NFC-e #${String(target.numero).padStart(6, '0')} cancelada na simulação.`);
  };

  const handleAddCashMovement = (
    type: 'SANGRIA' | 'SUPRIMENTO',
    amount: number,
    description: string
  ) => {
    const now = new Date();
    const formattedTimestamp = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;
    const newMov: CashMovement = {
      id: `mov-${Date.now()}`,
      type,
      amount,
      description,
      createdAt: formattedTimestamp,
      operatorName: 'Maurício',
    };
    setMovements((prev) => [newMov, ...prev]);
    triggerToast(
      `${type === 'SANGRIA' ? 'Sangria' : 'Suprimento'} de ${formatBRL(amount)} registrado.`
    );
  };

  // Filter products for the POS grid
  const displayedProducts = availableProducts.filter((prod) => {
    if (prod.kind === 'service' && !searchQuery.trim()) return selectedCategory === 'Bebidas' || selectedCategory === 'Outros';
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      return (
        prod.name.toLowerCase().includes(q) ||
        prod.barcode.includes(q) ||
        prod.code.includes(q)
      );
    }
    // Preserve exact 6 reference cards when on default 'Bebidas' or 'Favoritos' view
    if (useReferenceSixGrid && (selectedCategory === 'Bebidas' || selectedCategory === 'Favoritos')) {
      return Boolean(prod.featuredInMainGrid);
    }
    if (selectedCategory === 'Favoritos') {
      return prod.isFavorite;
    }
    return prod.category === selectedCategory;
  });

  const categories: CategoryId[] = ['Favoritos', 'Bebidas', 'Lanches', 'Doces', 'Outros'];

  return (
    <div className="min-h-screen h-screen w-full bg-[#141e22] text-slate-100 flex flex-col select-none overflow-hidden">
      {/* Top Bar — Strict 3-Zone Contract matching reference POS layout */}
      <header className="h-16 px-5 bg-[#1b272c] border-b border-white/10 flex items-center justify-between gap-8 shrink-0">
        {/* Zone 1: Brand Emblem + Operator Profile */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Geometric Emerald "C" Logo from reference */}
          <button
            onClick={() => setWorkspace('POS')}
            className="flex items-center gap-3 group cursor-pointer focus:outline-none"
            title={business?.name ?? "CromaPDV Fiscal"}
          >
            {business?.logo ? <img src={business.logo} alt="" className="h-8 w-8 object-contain" /> : <svg
              viewBox="0 0 36 36"
              className="w-8 h-8 text-[#00c885] shrink-0 transition-transform group-hover:scale-105"
              fill="none"
            >
              <path
                d="M18 3L5 10.5V25.5L18 33L26 28.4V21.5L18 26L11 22V14L18 10L26 14.5V7.6L18 3Z"
                fill="currentColor"
              />
              <polygon points="21,15 29,11 29,25 21,21" fill="currentColor" opacity="0.85" />
            </svg>}
          </button>

          {/* Operator Profile Lockup */}
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/products/operador_mauricio.png"
              alt="Operador Maurício"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-white/20 shrink-0"
            />
            <div className="leading-tight">
              <div className="text-[11px] text-slate-400 font-normal">Operador</div>
              <div className="text-sm font-bold text-white whitespace-nowrap">Maurício</div>
            </div>
          </div>
        </div>

        {/* Zone 2: Center Status Action + Single-Line Workspace Nav Links */}
        <nav className="flex items-center gap-6">
          <button
            onClick={() => setShowCashModal(true)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
              isRegisterOpen
                ? 'bg-[#193d33] text-[#19e6a2] border-[#00c885]/30 hover:bg-[#1f4b3f]'
                : 'bg-red-950/60 text-red-300 border-red-500/30 hover:bg-red-900/50'
            }`}
          >
            {isRegisterOpen ? 'Caixa Aberto' : 'Caixa Fechado'}
          </button>

          <div className="hidden lg:flex items-center gap-5 text-xs font-medium">
            <button
              onClick={() => setWorkspace('POS')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer ${
                workspace === 'POS'
                  ? 'text-[#00c885] underline underline-offset-4 decoration-2'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              PDV / Caixa
            </button>
            <button onClick={() => setWorkspace('SALES')}
              className={workspace === 'SALES' ? 'text-[#00c885]' : 'text-slate-400 hover:text-white'}>
              Vendas
            </button>
            <button
              onClick={() => setWorkspace('NFCE_HISTORY')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer ${
                workspace === 'NFCE_HISTORY'
                  ? 'text-[#00c885] underline underline-offset-4 decoration-2'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Notas Fiscais ({invoices.length})
            </button>
            <button
              onClick={() => setWorkspace('CATALOG')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer ${
                workspace === 'CATALOG'
                  ? 'text-[#00c885] underline underline-offset-4 decoration-2'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Catálogo
            </button>
            <button
              onClick={() => setWorkspace('CONFIG_FISCAL')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer ${
                workspace === 'CONFIG_FISCAL'
                  ? 'text-[#00c885] underline underline-offset-4 decoration-2'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Config. Fiscal & Certificado
            </button>
          </div>
        </nav>

        {business && (
          <button type="button" className="min-w-0 truncate text-sm text-slate-200"
            onClick={() => setShowBusinessSetup(true)} title="Meu negócio">
            {business.name} · Meu negócio
          </button>
        )}

        {/* Zone 3: Primary Desktop Installer Action + Date/Time Telemetry */}
        <div className="flex items-center gap-4 shrink-0">
          {showInstallOptions && (
            <button
              type="button"
              onClick={() => setShowInstallerModal(true)}
              className="px-3.5 py-1.5 bg-[#00c885] hover:bg-[#00b377] text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
              title="Baixar Instalador para Computador (F9)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar no PC</span>
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="text-right font-mono tabular-nums leading-tight">
              <div className="text-xs text-slate-200 font-medium">{clockText.date}</div>
              <div className="text-xs text-slate-300 font-semibold">{clockText.time}</div>
            </div>
            <Clock className="w-5 h-5 text-slate-400 shrink-0" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {workspace === 'SALES' ? (
        <SalesHistory movements={movements} invoices={invoices} />
      ) : workspace === 'NFCE_HISTORY' ? (
        <InvoicesHistoryView
          invoices={invoices}
          store={storeConfig}
          onSelectInvoice={(inv) => setActiveDanfeInvoice(inv)}
          onTransmitSingleContingency={(invId) => {
            setInvoices((prev) =>
              prev.map((inv) =>
                inv.id === invId
                  ? { ...inv, status: 'AUTORIZADA', protocolo: generateProtocoloSefaz() }
                  : inv
              )
            );
            triggerToast('Autorização da nota em contingência simulada.');
          }}
          onBackToPos={() => setWorkspace('POS')}
        />
      ) : workspace === 'CATALOG' ? (
        <CatalogFiscalView
          products={availableProducts}
          profile={profile}
          onAddProduct={async (newProd) => {
            if (!(await setProducts((prev) => [newProd, ...prev]))) return;
            triggerToast(`Produto "${newProd.name}" cadastrado.`);
          }}
          onUpdateProduct={async (updatedProd) => {
            const saved = await saveSnapshot((current) => ({
              ...current,
              products: current.products.map((p) => p.id === updatedProd.id ? updatedProd : p),
              cart: current.cart.map((item) =>
                item.product.id === updatedProd.id ? { ...item, product: updatedProd } : item
              ),
            }));
            if (!saved) return;
            triggerToast(`Produto "${updatedProd.name}" atualizado com sucesso.`);
          }}
          onDeleteProduct={async (id) => {
            const target = products.find((p) => p.id === id);
            const saved = await saveSnapshot((current) => ({
              ...current,
              products: current.products.filter((p) => p.id !== id),
              cart: current.cart.filter((item) => item.product.id !== id),
            }));
            if (!saved) return;
            if (target) {
              triggerToast(`Produto "${target.name}" removido do catálogo.`);
            }
          }}
          onToggleFavorite={(id) => {
            setProducts((prev) =>
              prev.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p))
            );
          }}
          onBackToPos={() => setWorkspace('POS')}
        />
      ) : workspace === 'CONFIG_FISCAL' ? (
        <FiscalConfigView
          store={storeConfig}
          invoices={invoices}
          onUpdateStore={(updated) => setStoreConfig(updated)}
          onTransmitContingencyInvoices={() => {
            setInvoices((prev) =>
              prev.map((inv) =>
                inv.status === 'CONTINGENCIA'
                  ? { ...inv, status: 'AUTORIZADA', protocolo: generateProtocoloSefaz() }
                  : inv
              )
            );
            triggerToast('Autorização do lote em contingência simulada.');
          }}
          onBackToPos={() => setWorkspace('POS')}
        />
      ) : (
        /* Main POS Split Screen (Left Catalog + Right Cupom/Carrinho) */
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* Left Column: Search, Categories, Product Grid & Function Keys */}
          <section className="lg:col-span-8 flex flex-col justify-between p-5 min-h-0 overflow-hidden border-r border-white/10">
            <div className="flex flex-col min-h-0 flex-1 space-y-4">
              {/* Search & Barcode Input Bar */}
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-300 absolute left-4 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Buscar produto ou bipar código de barras (F3)..."
                  className="w-full pl-11 pr-32 py-2.5 bg-[#1e2c32] border-[1.5px] border-[#00c885] rounded-lg text-sm text-white placeholder-slate-300/80 focus:outline-none focus:ring-2 focus:ring-[#00c885]/30 transition-all"
                />
                {profile !== 'services' && (
                  <button
                    type="button"
                    onClick={handleSimulateBarcodeScan}
                    className="absolute right-2 px-2.5 py-1 bg-[#283941] hover:bg-[#324650] text-slate-200 rounded text-xs font-medium flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                    title="Simular leitura de código de barras EAN-13"
                  >
                    <Barcode className="w-3.5 h-3.5 text-[#00c885]" />
                    <span>Bipar EAN</span>
                  </button>
                )}
              </div>

              {/* Category Tabs Row matching reference */}
              <div className="flex items-center justify-between border-b border-white/10 px-2">
                <div className="flex items-center gap-6 sm:gap-10 overflow-x-auto">
                  {categories.map((cat) => {
                    const isActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          if (cat === 'Lanches' || cat === 'Doces' || cat === 'Outros') {
                            setUseReferenceSixGrid(false);
                          } else {
                            setUseReferenceSixGrid(true);
                          }
                        }}
                        className={`pb-2.5 text-sm font-medium whitespace-nowrap transition-colors relative cursor-pointer ${
                          isActive ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                        {isActive && (
                          <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#00c885] rounded-t-full" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Mobile / Tablet quick access to NFC-e History */}
                <button
                  type="button"
                  onClick={() => setWorkspace('NFCE_HISTORY')}
                  className="lg:hidden text-xs font-medium text-[#00c885] whitespace-nowrap pb-2 cursor-pointer"
                >
                  Notas NFC-e ({invoices.length})
                </button>
              </div>

              {/* Product Cards Grid (3 columns matching reference layout) */}
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {displayedProducts.map((product) => {
                    const inCartItem = cart.find((c) => c.product.id === product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addToCart(product, 1)}
                        className="group bg-[#26343b] hover:bg-[#2d3e46] border border-white/10 hover:border-[#00c885]/50 rounded-lg overflow-hidden text-left flex flex-col transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#00c885] cursor-pointer active:scale-[0.99]"
                      >
                        {/* Top Photo Container */}
                        <div className="relative w-full h-32 sm:h-36 bg-[#1b262b] overflow-hidden">
                          <img
                            src={product.image}
                            alt={product.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          {inCartItem && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 bg-[#00c885] text-slate-950 font-mono font-bold text-xs rounded shadow tabular-nums">
                              {inCartItem.quantity}x
                            </span>
                          )}
                        </div>

                        {/* Bottom Card Label & Price */}
                        <div className="p-3 flex flex-col justify-between flex-1">
                          <div className="text-sm font-medium text-slate-100 truncate">
                            {product.name}
                          </div>
                          <div className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">
                            {formatBRL(product.price)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Function Key Shortcut Bar (F1, F4, F6, F7, F8) */}
            <div className="pt-3 mt-2 border-t border-white/10 flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="px-3 py-1.5 bg-[#202d33] hover:bg-[#2a3a42] border border-white/15 rounded text-xs text-slate-300 font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                F1: Ajuda
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cart.length > 0) setShowDiscountModal(true);
                  else triggerToast('Adicione itens ao cupom para aplicar desconto.');
                }}
                className="px-3 py-1.5 bg-[#202d33] hover:bg-[#2a3a42] border border-white/15 rounded text-xs text-slate-300 font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                F4: Desconto
              </button>
              <button
                type="button"
                onClick={() => setShowCashModal(true)}
                className="px-3 py-1.5 bg-[#202d33] hover:bg-[#2a3a42] border border-white/15 rounded text-xs text-slate-300 font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                F7: Sangria
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cart.length > 0) setShowCancelConfirmModal(true);
                  else triggerToast('O cupom já está vazio.');
                }}
                className="px-3 py-1.5 bg-[#202d33] hover:bg-[#2a3a42] border border-white/15 rounded text-xs text-slate-300 font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                F8: Cancelar
              </button>
              {showInstallOptions && (
                <button
                  type="button"
                  onClick={() => setShowInstallerModal(true)}
                  className="px-3 py-1.5 bg-[#202d33] hover:bg-[#2a3a42] border border-[#00c885]/40 rounded text-xs text-[#00c885] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  F9: Instalador PC
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowCpfModal(true)}
                className="px-3 py-1.5 bg-[#202d33] hover:bg-[#2a3a42] border border-white/15 rounded text-xs text-slate-300 font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ml-auto"
              >
                F6: {customerCpf ? `CPF: ${customerCpf}` : 'CPF/CNPJ na Nota'}
              </button>
            </div>
          </section>

          {/* Right Column: CUPOM / CARRINHO */}
          <aside className="lg:col-span-4 bg-[#192429] flex flex-col justify-between p-5 min-h-0 overflow-hidden">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-4 h-4 text-slate-300" />
                <h2 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                  CUPOM / CARRINHO
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {customerCpf && (
                  <button
                    onClick={() => setShowCpfModal(true)}
                    className="text-[11px] font-mono text-[#00c885] hover:underline cursor-pointer"
                  >
                    CPF: {customerCpf}
                  </button>
                )}
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto py-3 divide-y divide-white/10">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
                  <ShoppingCart className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-sm font-medium text-slate-400">Cupom fiscal aberto e vazio</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Clique em um produto ao lado ou bipe o código de barras (F3) para iniciar a venda.
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const lineTotal = item.product.price * item.quantity;
                  return (
                    <div
                      key={item.product.id}
                      className="py-3 flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-md object-cover border border-white/10 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {item.product.name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400 font-mono tabular-nums">
                              {item.quantity}x
                            </span>
                            {/* Inline quantity stepper controls */}
                            <div className="flex items-center gap-1 opacity-85 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(item.product.id, -1)}
                                className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 cursor-pointer"
                                title="Diminuir quantidade"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(item.product.id, 1)}
                                className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 cursor-pointer"
                                title="Aumentar quantidade"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.product.id)}
                                className="w-5 h-5 rounded hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 cursor-pointer"
                                title="Remover item"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm font-medium text-slate-200 font-mono tabular-nums shrink-0">
                        ({formatBRL(lineTotal)})
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cart Footer Summary & Primary Emerald CTA */}
            <div className="pt-4 border-t border-white/10 space-y-4 shrink-0">
              <div className="space-y-1.5 text-sm tabular-nums">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold text-white">{formatBRL(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <button
                    type="button"
                    onClick={() => setShowDiscountModal(true)}
                    className="hover:text-[#00c885] transition-colors cursor-pointer"
                  >
                    Desconto:
                  </button>
                  <span className="font-mono font-semibold text-white">
                    {formatBRL(effectiveDiscount)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setShowCheckoutModal(true)}
                className="w-full py-4 px-4 bg-[#00c885] hover:bg-[#00b87a] disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-sm tracking-wide rounded-xl shadow-[0_0_25px_rgba(0,200,133,0.35)] hover:shadow-[0_0_32px_rgba(0,200,133,0.55)] transition-all cursor-pointer tabular-nums"
              >
                FINALIZAR VENDA (F2) - TOTAL: {formatBRL(total)}
              </button>
            </div>
          </aside>
        </main>
      )}

      {(!business || showBusinessSetup) && (
        <BusinessSetup business={business} onSave={saveBusiness}
          onClose={business ? () => setShowBusinessSetup(false) : undefined} />
      )}
      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[60] bg-[#141e22] border border-[#00c885] text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium">
          {toastMessage}
        </div>
      )}

      {/* Checkout & NFC-e Emission Modal */}
      <div role="status" className="fixed bottom-0 left-0 z-40 bg-amber-950 px-3 py-1 text-xs text-amber-100 print:hidden">
        Modo demonstração fiscal · sem comunicação com a SEFAZ
      </div>
      {showCheckoutModal && (
        <CheckoutModal
          items={cart}
          allowFiscalSimulation={cart.every(item => item.product.kind !== 'service')}
          subtotal={subtotal}
          discount={effectiveDiscount}
          initialCustomerCpf={customerCpf}
          initialCustomerName={customerName}
          onUpdateDiscount={(d) => setDiscount(d)}
          onClose={() => setShowCheckoutModal(false)}
          onConfirmSale={handleConfirmSale}
        />
      )}

      {/* DANFE NFC-e Thermal Receipt Modal */}
      {activeDanfeInvoice && (
        <DanfeModal
          invoice={activeDanfeInvoice}
          store={storeConfig}
          onClose={() => setActiveDanfeInvoice(null)}
          onCancelInvoice={handleCancelInvoice}
        />
      )}

      {/* Cash Register / Sangria / Suprimento Modal (F7) */}
      {showCashModal && (
        <CashMovementModal
          isOpenRegister={isRegisterOpen}
          movements={movements}
          onClose={() => setShowCashModal(false)}
          onAddMovement={handleAddCashMovement}
          onToggleRegisterStatus={async () => {
            if (!(await setField('registerOpen')(!isRegisterOpen))) return;
            triggerToast(
              !isRegisterOpen ? 'Caixa reaberto para vendas.' : 'Caixa fechado temporariamente.'
            );
          }}
        />
      )}

      {/* CPF/CNPJ na Nota Quick Modal (F6) */}
      {showCpfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#1b272c] border border-white/10 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#00c885]" />
                <h3 className="text-sm font-bold text-white">CPF / CNPJ na Nota Fiscal (F6)</h3>
              </div>
              <button
                onClick={() => setShowCpfModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">CPF ou CNPJ do Consumidor</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="000.000.000-00"
                  value={customerCpf}
                  onChange={(e) => setCustomerCpf(formatCpfCnpj(e.target.value))}
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-sm text-white font-mono tabular-nums focus:outline-none focus:border-[#00c885]"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome Completo (Opcional)</label>
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:border-[#00c885]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setCustomerCpf('');
                  setCustomerName('');
                  setShowCpfModal(false);
                }}
                className="px-3 py-1.5 bg-white/10 text-slate-300 text-xs rounded-lg cursor-pointer"
              >
                Limpar
              </button>
              <button
                onClick={() => {
                  setShowCpfModal(false);
                  triggerToast(
                    customerCpf
                      ? `CPF/CNPJ ${customerCpf} vinculado ao cupom.`
                      : 'Consumidor sem CPF definido.'
                  );
                }}
                className="px-4 py-1.5 bg-[#00c885] text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal (F4) */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#1b272c] border border-white/10 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-[#00c885]" />
                <h3 className="text-sm font-bold text-white">Aplicar Desconto no Cupom (F4)</h3>
              </div>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-slate-400 tabular-nums">
                Subtotal atual: <span className="text-white font-mono">{formatBRL(subtotal)}</span>
              </div>
              <div className="flex gap-2">
                {[5, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscount(Number(((subtotal * pct) / 100).toFixed(2)))}
                    className="flex-1 py-1.5 bg-[#25333a] hover:bg-[#31434c] text-xs font-mono text-emerald-300 rounded border border-white/10 cursor-pointer"
                  >
                    {pct}% ({formatBRL((subtotal * pct) / 100)})
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Valor do Desconto (R$)</label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  max={subtotal}
                  value={discount}
                  onChange={(e) =>
                    setDiscount(Math.min(subtotal, Math.max(0, parseFloat(e.target.value) || 0)))
                  }
                  className="w-full px-3 py-2 bg-[#141e22] border border-white/15 rounded-lg text-sm text-white font-mono tabular-nums focus:outline-none focus:border-[#00c885]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setDiscount(0);
                  setShowDiscountModal(false);
                }}
                className="px-3 py-1.5 bg-white/10 text-slate-300 text-xs rounded-lg cursor-pointer"
              >
                Zerar Desconto
              </button>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="px-4 py-1.5 bg-[#00c885] text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Cupom Confirmation Modal (F8) */}
      {showCancelConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#1b272c] border border-white/10 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Cancelar Cupom em Aberto (F8)?</h3>
            <p className="text-xs text-slate-300">
              Todos os {cart.reduce((acc, i) => acc + i.quantity, 0)} itens lançados no carrinho atual
              serão removidos.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCancelConfirmModal(false)}
                className="px-3 py-1.5 bg-white/10 text-slate-300 text-xs rounded-lg cursor-pointer"
              >
                Manter Itens
              </button>
              <button
                onClick={clearCart}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg cursor-pointer"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help & Shortcuts Modal (F1) */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#1b272c] border border-white/10 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#00c885]" />
                <h3 className="text-sm font-bold text-white">
                  Atalhos de Teclado & Guia Fiscal PDV (F1)
                </h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-300 font-mono">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-[#00c885] font-bold">F2</span>
                <span>Finalizar venda</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-[#00c885] font-bold">F3</span>
                <span>Focar Busca / Leitor de Código de Barras</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-[#00c885] font-bold">F4</span>
                <span>Aplicar Desconto (R$ ou %) no Cupom</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-[#00c885] font-bold">F6</span>
                <span>Identificar CPF / CNPJ do Consumidor</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-[#00c885] font-bold">F7</span>
                <span>Sangria, Suprimento e Fechamento de Caixa</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-[#00c885] font-bold">F8</span>
                <span>Cancelar / Limpar Cupom Atual</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#00c885] font-bold">QTD*CÓDIGO</span>
                <span>Ex: digite 3*1001 + Enter para lançar 3 unidades</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 bg-[#00c885] text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop & PWA Installer Modal (F9) */}
      {showInstallOptions && showInstallerModal && (
        <DesktopInstallerModal onClose={() => setShowInstallerModal(false)} />
      )}
    </div>
  );
}
