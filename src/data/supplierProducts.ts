export interface SupplierProduct {
  code: string;
  name: string;
  barcode: string;
  ncm: string;
  cest: string;
  unit: string;
}

export function readSupplierProducts(xml: string): SupplierProduct[] {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.doctype || document.querySelector('parsererror')) {
    throw new Error('XML inválido.');
  }
  const ns = 'http://www.portalfiscal.inf.br/nfe';
  const invoices = Array.from(document.getElementsByTagNameNS(ns, 'infNFe'));
  return invoices.flatMap(invoice =>
    Array.from(invoice.getElementsByTagNameNS(ns, 'prod')).map(product => {
      const read = (tag: string) => product.getElementsByTagNameNS(ns, tag)[0]?.textContent?.trim() ?? '';
      const barcode = read('cEAN');
      const ncm = read('NCM');
      const cest = read('CEST');
      return {
        code: read('cProd'),
        name: read('xProd'),
        barcode: /^(?:\d{8}|\d{12,14})$/.test(barcode) ? barcode : '',
        ncm: /^\d{8}$/.test(ncm) ? ncm : '',
        cest: /^\d{7}$/.test(cest) ? cest : '',
        unit: read('uCom').toUpperCase(),
      };
    }).filter(product => product.name)
  );
}
