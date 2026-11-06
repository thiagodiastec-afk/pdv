export type CategoryId = 'Favoritos' | 'Bebidas' | 'Lanches' | 'Doces' | 'Outros';

export interface Product {
  kind?: 'service';
  serviceCode?: string;
  id: string;
  code: string;
  barcode: string;
  name: string;
  price: number;
  category: Exclude<CategoryId, 'Favoritos'>;
  isFavorite: boolean;
  featuredInMainGrid?: boolean;
  image: string;
  unit: 'UN' | 'KG' | 'LT';
  ncm: string;
  cfop: '5102' | '5405';
  csosn: '102' | '500';
  cest?: string;
  ibptFederalPct: number;
  ibptStatePct: number;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export type PaymentMethod = 'DINHEIRO' | 'PIX' | 'CREDITO' | 'DEBITO' | 'VALE_REFEICAO';

export interface FiscalInvoice {
  id: string;
  numero: number;
  serie: number;
  modelo: '65'; // NFC-e
  createdAt: string;
  operatorName: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountTendered: number;
  changeAmount: number;
  customerCpfCnpj?: string;
  customerName?: string;
  chaveAcesso: string;
  protocolo: string;
  status: 'AUTORIZADA' | 'CANCELADA' | 'CONTINGENCIA';
  ambienteEmissao: '1 - Produção' | '2 - Homologação';
  cancelReason?: string;
  tribFederal: number;
  tribEstadual: number;
}

export type SaleOperation = 'counter' | 'repair';

export interface CashMovement {
  operation?: SaleOperation;
  id: string;
  type: 'ABERTURA' | 'VENDA' | 'SANGRIA' | 'SUPRIMENTO' | 'ESTORNO';
  amount: number;
  paymentMethod?: PaymentMethod;
  description: string;
  createdAt: string;
  operatorName: string;
  invoiceNumero?: number;
  items?: CartItem[];
  discount?: number;
}

export interface StoreFiscalConfig {
  // Emitente (Lojista)
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  endereco: string;
  cidadeUf: string;
  codigoIbgeMunicipio: string;
  cep: string;
  regimeTributario: '1 - Simples Nacional' | '3 - Regime Normal (Lucro Presumido/Real)';
  // Parâmetros SEFAZ NFC-e
  ambienteSefaz: '1 - Produção' | '2 - Homologação';
  modoContingenciaOffline: boolean;
  justificativaContingencia: string;
  cscId: string;
  cscToken: string;
  seriePadrao: number;
  proximoNumeroNfce: number;
  // Certificado Digital A1 (.pfx)
  certificadoArquivoNome: string;
  certificadoValidade: string;
  certificadoEmissor: string;
  certificadoStatus: 'ATIVO' | 'EXPIRADO' | 'PENDENTE';
  // Software House (<infRespTec> e API de Mensageria)
  provedorApiFiscal: 'FOCUS_NFE' | 'NUVEM_FISCAL' | 'PLUG_NOTAS' | 'SEFAZ_DIRETO';
  respTecCnpj: string;
  respTecContato: string;
  respTecEmail: string;
  respTecFone: string;
  // Contabilidade do Lojista
  contadorNome: string;
  contadorEmail: string;
  contadorCrc: string;
}

export const INITIAL_STORE_CONFIG: StoreFiscalConfig = {
  razaoSocial: 'CROMA CAFE E GASTRONOMIA LTDA',
  nomeFantasia: 'Croma Café & Padaria Artesanal',
  cnpj: '42.819.304/0001-68',
  inscricaoEstadual: '119.482.731.114',
  endereco: 'Av. Paulista, 1450 - Loja 04 - Bela Vista',
  cidadeUf: 'São Paulo - SP',
  codigoIbgeMunicipio: '3550308',
  cep: '01310-100',
  regimeTributario: '1 - Simples Nacional',
  ambienteSefaz: '2 - Homologação',
  modoContingenciaOffline: false,
  justificativaContingencia: 'Instabilidade temporária no link de internet do estabelecimento',
  cscId: '000001',
  cscToken: 'A9F8E7D6-C5B4-4321-9876-543210FEDCBA',
  seriePadrao: 1,
  proximoNumeroNfce: 1483,
  certificadoArquivoNome: 'certificado_a1_cromacafe_2026.pfx',
  certificadoValidade: '18/10/2027',
  certificadoEmissor: 'AC Certisign Múltipla G7 - ICP-Brasil',
  certificadoStatus: 'ATIVO',
  provedorApiFiscal: 'FOCUS_NFE',
  respTecCnpj: '51.904.220/0001-80',
  respTecContato: 'Thiago Dias - Engenharia Fiscal',
  respTecEmail: 'suporte@cromapdv.com.br',
  respTecFone: '11998887766',
  contadorNome: 'Contabilidade Varejo Digital S/S',
  contadorEmail: 'fiscal@contabilidadevarejo.com.br',
  contadorCrc: '1SP294810/O-4',
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    code: '1001',
    barcode: '7891000010013',
    name: 'Café Expresso',
    price: 6.00,
    category: 'Bebidas',
    isFavorite: true,
    featuredInMainGrid: true,
    image: '/assets/products/cafe_expresso.png',
    unit: 'UN',
    ncm: '09012100',
    cfop: '5102',
    csosn: '102',
    ibptFederalPct: 4.2,
    ibptStatePct: 12.0,
    stock: 140,
  },
  {
    id: 'prod-2',
    code: '1002',
    barcode: '7891000010020',
    name: 'Pão de Queijo',
    price: 5.50,
    category: 'Lanches',
    isFavorite: true,
    featuredInMainGrid: true,
    image: '/assets/products/pao_de_queijo.png',
    unit: 'UN',
    ncm: '19059090',
    cfop: '5102',
    csosn: '102',
    ibptFederalPct: 4.2,
    ibptStatePct: 12.0,
    stock: 85,
  },
  {
    id: 'prod-3',
    code: '1003',
    barcode: '7891000010037',
    name: 'Bolo de Cenoura',
    price: 8.00,
    category: 'Doces',
    isFavorite: true,
    featuredInMainGrid: true,
    image: '/assets/products/bolo_de_cenoura.png',
    unit: 'UN',
    ncm: '19059090',
    cfop: '5102',
    csosn: '102',
    ibptFederalPct: 4.2,
    ibptStatePct: 12.0,
    stock: 32,
  },
  {
    id: 'prod-4',
    code: '1004',
    barcode: '7891000010044',
    name: 'Suco Natural',
    price: 9.00,
    category: 'Bebidas',
    isFavorite: true,
    featuredInMainGrid: true,
    image: '/assets/products/suco_natural.png',
    unit: 'UN',
    ncm: '20091200',
    cfop: '5102',
    csosn: '102',
    ibptFederalPct: 4.2,
    ibptStatePct: 12.0,
    stock: 60,
  },
  {
    id: 'prod-5',
    code: '1005',
    barcode: '7891000010051',
    name: 'Água Mineral',
    price: 4.00,
    category: 'Bebidas',
    isFavorite: true,
    featuredInMainGrid: true,
    image: '/assets/products/agua_mineral.png',
    unit: 'UN',
    ncm: '22011000',
    cfop: '5405',
    csosn: '500',
    cest: '0300100',
    ibptFederalPct: 4.2,
    ibptStatePct: 18.0,
    stock: 210,
  },
  {
    id: 'prod-6',
    code: '1006',
    barcode: '7891000010068',
    name: 'Salgado Assado',
    price: 7.50,
    category: 'Lanches',
    isFavorite: true,
    featuredInMainGrid: true,
    image: '/assets/products/salgado_assado.png',
    unit: 'UN',
    ncm: '19059090',
    cfop: '5102',
    csosn: '102',
    ibptFederalPct: 4.2,
    ibptStatePct: 12.0,
    stock: 48,
  },
  {
    id: 'prod-7',
    code: '1007',
    barcode: '7891000010075',
    name: 'Cappuccino Italiano',
    price: 11.00,
    category: 'Bebidas',
    isFavorite: false,
    image: '/assets/products/cafe_expresso.png',
    unit: 'UN',
    ncm: '09012100',
    cfop: '5102',
    csosn: '102',
    ibptFederalPct: 4.2,
    ibptStatePct: 12.0,
    stock: 75,
  },
  {
    id: 'prod-8',
    code: '1008',
    barcode: '7891000010082',
    name: 'Croissant Manteiga',
    price: 10.50,
    category: 'Lanches',
    isFavorite: false,
    image: '/assets/products/salgado_assado.png',
    unit: 'UN',
    ncm: '19059090',
    cfop: '5102',
    csosn: '102',
    ibptFederalPct: 4.2,
    ibptStatePct: 12.0,
    stock: 28,
  },
  {
    id: 'prod-9',
    code: '1009',
    barcode: '7891000010099',
    name: 'Brigadeiro Gourmet',
    price: 4.50,
    category: 'Doces',
    isFavorite: false,
    image: '/assets/products/bolo_de_cenoura.png',
    unit: 'UN',
    ncm: '18069000',
    cfop: '5102',
    csosn: '102',
    ibptFederalPct: 5.4,
    ibptStatePct: 18.0,
    stock: 90,
  },
  {
    id: 'prod-10',
    code: '1010',
    barcode: '7891000010105',
    name: 'Pacote Café em Grãos 250g',
    price: 28.00,
    category: 'Outros',
    isFavorite: false,
    image: '/assets/products/cafe_expresso.png',
    unit: 'UN',
    ncm: '09012100',
    cfop: '5102',
    csosn: '102',
    ibptFederalPct: 4.2,
    ibptStatePct: 12.0,
    stock: 22,
  },
  {
    id: 'prod-11',
    code: '1011',
    barcode: '7891000010112',
    name: 'Embalagem Para Viagem',
    price: 2.00,
    category: 'Outros',
    isFavorite: false,
    image: '/assets/products/pao_de_queijo.png',
    unit: 'UN',
    ncm: '48192000',
    cfop: '5102',
    csosn: '102',
    ibptFederalPct: 6.8,
    ibptStatePct: 18.0,
    stock: 300,
  },
];

export const INITIAL_CART: CartItem[] = [
  { product: INITIAL_PRODUCTS[0], quantity: 2 },
  { product: INITIAL_PRODUCTS[1], quantity: 1 },
  { product: INITIAL_PRODUCTS[2], quantity: 1 },
];

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCpfCnpj(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/**
 * Generates a realistic 44-digit SEFAZ Access Key (Chave de Acesso NFC-e)
 * Format: cUF(2) + AAMM(4) + CNPJ(14) + mod(2) + serie(3) + nNF(9) + tpEmis(1) + cNF(8) + cDV(1)
 */
export function generateChaveAcesso(
  cnpj: string,
  serie: number,
  numero: number,
  contingenciaOffline = false
): string {
  const cUF = '35'; // SP
  const aamm = '2611'; // Nov 2026
  const cleanCnpj = cnpj.replace(/\D/g, '').padStart(14, '0').slice(0, 14);
  const mod = '65'; // NFC-e
  const serieStr = String(serie).padStart(3, '0');
  const nNF = String(numero).padStart(9, '0');
  const tpEmis = contingenciaOffline ? '9' : '1';
  const cNF = String(Math.floor(10000000 + Math.random() * 89999999));

  const base43 = `${cUF}${aamm}${cleanCnpj}${mod}${serieStr}${nNF}${tpEmis}${cNF}`;

  let weight = 2;
  let sum = 0;
  for (let i = base43.length - 1; i >= 0; i--) {
    sum += parseInt(base43[i], 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  const dv = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;

  return `${base43}${dv}`;
}

export function formatChaveAcesso(chave: string): string {
  return chave.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function generateProtocoloSefaz(): string {
  const randomSuffix = String(Math.floor(100000000 + Math.random() * 899999999));
  return `135260${randomSuffix}`;
}

export const PAYMENT_LABELS: Record<PaymentMethod, { label: string; sefazCode: string }> = {
  DINHEIRO: { label: 'Dinheiro', sefazCode: '01' },
  PIX: { label: 'PIX Instantâneo', sefazCode: '17' },
  CREDITO: { label: 'Cartão de Crédito', sefazCode: '03' },
  DEBITO: { label: 'Cartão de Débito', sefazCode: '04' },
  VALE_REFEICAO: { label: 'Vale Refeição', sefazCode: '10' },
};

export function generateNfceXml(invoice: FiscalInvoice, store: StoreFiscalConfig): string {
  const cleanCnpj = store.cnpj.replace(/\D/g, '');
  const cleanIe = store.inscricaoEstadual.replace(/\D/g, '');
  const cleanCustomerDoc = (invoice.customerCpfCnpj || '').replace(/\D/g, '');
  const cleanRespTecCnpj = store.respTecCnpj.replace(/\D/g, '');
  const paymentCode = PAYMENT_LABELS[invoice.paymentMethod].sefazCode;
  const isHomologacao =
    (invoice.ambienteEmissao || store.ambienteSefaz).startsWith('2');
  const tpAmb = isHomologacao ? '2' : '1';
  const isContingencia = invoice.status === 'CONTINGENCIA';
  const tpEmis = isContingencia ? '9' : '1';
  const crt = store.regimeTributario.startsWith('1') ? '1' : '3';

  const detXml = invoice.items
    .map((item, idx) => {
      const vProd = (item.product.price * item.quantity).toFixed(2);
      const vUnCom = item.product.price.toFixed(2);
      // Regra oficial SEFAZ: Em homologação (tpAmb=2), o primeiro item deve conter a descrição padrão
      const xProdDesc =
        isHomologacao && idx === 0
          ? 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
          : item.product.name;

      return `    <det nItem="${idx + 1}">
      <prod>
        <cProd>${item.product.code}</cProd>
        <cEAN>${item.product.barcode}</cEAN>
        <xProd>${xProdDesc}</xProd>
        <NCM>${item.product.ncm}</NCM>
        <CFOP>${item.product.cfop}</CFOP>
        <uCom>${item.product.unit}</uCom>
        <qCom>${item.quantity.toFixed(4)}</qCom>
        <vUnCom>${vUnCom}</vUnCom>
        <vProd>${vProd}</vProd>
        <cEANTrib>${item.product.barcode}</cEANTrib>
        <uTrib>${item.product.unit}</uTrib>
        <qTrib>${item.quantity.toFixed(4)}</qTrib>
        <vUnTrib>${vUnCom}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <vTotTrib>${(((item.product.ibptFederalPct + item.product.ibptStatePct) / 100) * item.product.price * item.quantity).toFixed(2)}</vTotTrib>
        <ICMS>
          <ICMSSN102>
            <orig>0</orig>
            <CSOSN>${item.product.csosn}</CSOSN>
          </ICMSSN102>
        </ICMS>
      </imposto>
    </det>`;
    })
    .join('\n');

  const destXml = cleanCustomerDoc
    ? `    <dest>
      ${cleanCustomerDoc.length === 11 ? `<CPF>${cleanCustomerDoc}</CPF>` : `<CNPJ>${cleanCustomerDoc}</CNPJ>`}
      <xNome>${
        isHomologacao
          ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
          : invoice.customerName || 'CONSUMIDOR FINAL'
      }</xNome>
      <indIEDest>9</indIEDest>
    </dest>`
    : '';

  const contingenciaXml = isContingencia
    ? `        <dhCont>${invoice.createdAt}</dhCont>
        <xJust>${store.justificativaContingencia}</xJust>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${invoice.chaveAcesso}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <natOp>VENDA AO CONSUMIDOR</natOp>
        <mod>65</mod>
        <serie>${invoice.serie}</serie>
        <nNF>${invoice.numero}</nNF>
        <dhEmi>${invoice.createdAt}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>${store.codigoIbgeMunicipio}</cMunFG>
        <tpImp>4</tpImp>
        <tpEmis>${tpEmis}</tpEmis>
        <tpAmb>${tpAmb}</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
${contingenciaXml}
      </ide>
      <emit>
        <CNPJ>${cleanCnpj}</CNPJ>
        <xNome>${store.razaoSocial}</xNome>
        <xFant>${store.nomeFantasia}</xFant>
        <IE>${cleanIe}</IE>
        <CRT>${crt}</CRT>
      </emit>
${destXml}
${detXml}
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vProd>${invoice.subtotal.toFixed(2)}</vProd>
          <vDesc>${invoice.discount.toFixed(2)}</vDesc>
          <vNF>${invoice.total.toFixed(2)}</vNF>
          <vTotTrib>${(invoice.tribFederal + invoice.tribEstadual).toFixed(2)}</vTotTrib>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>9</modFrete>
      </transp>
      <pag>
        <detPag>
          <tPag>${paymentCode}</tPag>
          <vPag>${invoice.total.toFixed(2)}</vPag>
        </detPag>
        <vTroco>${invoice.changeAmount.toFixed(2)}</vTroco>
      </pag>
      <infRespTec>
        <CNPJ>${cleanRespTecCnpj}</CNPJ>
        <xContato>${store.respTecContato}</xContato>
        <email>${store.respTecEmail}</email>
        <fone>${store.respTecFone}</fone>
      </infRespTec>
    </infNFe>
    <infNFeSupl>
      <qrCode>https://www.nfce.fazenda.sp.gov.br/qrcode?p=${invoice.chaveAcesso}|2|${tpAmb}|${Number(store.cscId) || 1}</qrCode>
      <urlChave>https://www.nfce.fazenda.sp.gov.br/consulta</urlChave>
    </infNFeSupl>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>${tpAmb}</tpAmb>
      <verAplic>SP_NFCE_PL_009_V400</verAplic>
      <chNFe>${invoice.chaveAcesso}</chNFe>
      <dhRecbto>${invoice.createdAt}</dhRecbto>
      <nProt>${invoice.protocolo}</nProt>
      <cStat>${isContingencia ? '150' : '100'}</cStat>
      <xMotivo>${isContingencia ? 'Emitido em Contingencia Offline' : 'Autorizado o uso da NFC-e'}</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;
}

export const INITIAL_INVOICES: FiscalInvoice[] = [
  {
    id: 'inv-1481',
    numero: 1481,
    serie: 1,
    modelo: '65',
    createdAt: '05/11/2026 14:32:18',
    operatorName: 'Maurício',
    items: [
      { product: INITIAL_PRODUCTS[0], quantity: 1 },
      { product: INITIAL_PRODUCTS[1], quantity: 2 },
    ],
    subtotal: 17.00,
    discount: 0,
    total: 17.00,
    paymentMethod: 'PIX',
    amountTendered: 17.00,
    changeAmount: 0,
    customerCpfCnpj: '348.921.048-12',
    customerName: 'Fernanda Costa',
    chaveAcesso: '35261142819304000168650010000014811492817429',
    protocolo: '135260492817401',
    status: 'AUTORIZADA',
    ambienteEmissao: '1 - Produção',
    tribFederal: 0.71,
    tribEstadual: 2.04,
  },
  {
    id: 'inv-1482',
    numero: 1482,
    serie: 1,
    modelo: '65',
    createdAt: '05/11/2026 14:48:05',
    operatorName: 'Maurício',
    items: [
      { product: INITIAL_PRODUCTS[4], quantity: 2 },
      { product: INITIAL_PRODUCTS[5], quantity: 1 },
    ],
    subtotal: 15.50,
    discount: 0,
    total: 15.50,
    paymentMethod: 'DEBITO',
    amountTendered: 15.50,
    changeAmount: 0,
    chaveAcesso: '35261142819304000168650010000014821839201483',
    protocolo: '135260839201482',
    status: 'AUTORIZADA',
    ambienteEmissao: '2 - Homologação',
    tribFederal: 0.65,
    tribEstadual: 2.34,
  },
];

export const INITIAL_MOVEMENTS: CashMovement[] = [
  {
    id: 'mov-1',
    type: 'ABERTURA',
    amount: 200.00,
    description: 'Fundo de troco inicial do turno',
    createdAt: '05/11/2026 08:00:00',
    operatorName: 'Maurício',
  },
  {
    id: 'mov-2',
    type: 'VENDA',
    amount: 17.00,
    paymentMethod: 'PIX',
    description: 'Venda NFC-e #001481',
    createdAt: '05/11/2026 14:32:18',
    operatorName: 'Maurício',
    invoiceNumero: 1481,
  },
  {
    id: 'mov-3',
    type: 'VENDA',
    amount: 15.50,
    paymentMethod: 'DEBITO',
    description: 'Venda NFC-e #001482',
    createdAt: '05/11/2026 14:48:05',
    operatorName: 'Maurício',
    invoiceNumero: 1482,
  },
];
