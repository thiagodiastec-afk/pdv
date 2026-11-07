const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const storageKey = 'cromapdv_snapshot_v1';
const url = process.env.PDV_TEST_URL || 'http://127.0.0.1:4173/';
const xml = Buffer.from(`<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe>
  <det><prod><cEAN>7891234567895</cEAN><xProd>Shampoo lote</xProd><NCM>33051000</NCM><uCom>UN</uCom></prod></det>
  <det><prod><cEAN>7891234567895</cEAN><xProd>Shampoo duplicado</xProd><NCM>33051000</NCM><uCom>UN</uCom></prod></det>
  <det><prod><cEAN>SEM GTIN</cEAN><xProd>Sabonete lote</xProd><NCM>34011190</NCM><uCom>UN</uCom></prod></det>
</infNFe></NFe></nfeProc>`);

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const page = await browser.newPage();
    const products = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).products, storageKey);
    await page.goto(url);
    await page.getByLabel('Nome comercial').fill('Teste de catálogo');
    await page.getByRole('radio', { name: /Operação mista/ }).check();
    await page.getByRole('button', { name: 'Começar' }).click();
    await page.getByRole('button', { name: 'Catálogo', exact: true }).click();
    await page.getByRole('button', { name: 'Importar XML em lote' }).click();
    const file = page.getByLabel('XML para importação em lote');
    const loadFile = () => file.setInputFiles({ name: 'lote.xml', mimeType: 'application/xml', buffer: xml });
    await loadFile();
    await page.getByText(/1 item\(ns\) com código de barras repetido/).waitFor();
    assert.equal(await page.getByLabel('Importar linha 2').isChecked(), false);
    const save = page.getByRole('button', { name: 'Cadastrar produtos selecionados' });
    await save.click();
    await page.getByText(/Informe um preço de venda positivo/).waitFor();
    assert.equal((await products()).length, 0);
    await page.getByLabel('Preço de venda da linha 1').fill('32,50');
    await page.getByLabel('Estoque da linha 1').fill('3');
    await page.getByLabel('Preço de venda da linha 3').fill('5');
    await save.click();
    await page.getByText('2 produto(s) cadastrado(s).').waitFor();
    const imported = await products();
    assert.equal(imported.length, 2);
    assert.equal(imported.find(product => product.barcode === '7891234567895').price, 32.5);
    assert.equal(imported.find(product => product.barcode === '7891234567895').stock, 3);
    assert.equal(new Set(imported.map(product => product.code)).size, 2);
    await loadFile();
    await page.getByText(/2 item\(ns\) com código de barras repetido/).waitFor();
    assert(await page.getByLabel('Importar linha 1').isDisabled());
    await page.getByRole('button', { name: 'Ocultar importação em lote' }).click();
    console.log('PASS importação em lote, revisão e duplicidade de GTIN');

    await page.getByRole('button', { name: 'Cadastrar item' }).click();
    await page.getByLabel('Tipo do item').selectOption('service');
    await page.getByPlaceholder('Nome do item').fill('Conserto básico');
    await page.getByLabel('Código nacional do serviço').fill('140101');
    await page.getByLabel('Preço unitário').fill('45');
    await page.getByRole('button', { name: 'Salvar item' }).click();
    await page.getByRole('button', { name: 'Duplicar serviço' }).click();
    assert.equal(await page.getByPlaceholder('Nome do item').inputValue(), 'Conserto básico (cópia)');
    assert.equal(await page.getByLabel('Código nacional do serviço').inputValue(), '140101');
    await page.getByPlaceholder('Nome do item').fill('Conserto avançado');
    await page.getByLabel('Preço unitário').fill('80');
    await page.getByRole('button', { name: 'Salvar item' }).click();
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).products.length === 4, storageKey);
    const services = (await products()).filter(product => product.kind === 'service');
    assert.equal(services.length, 2);
    assert.equal(services.find(service => service.name === 'Conserto avançado').price, 80);
    assert.equal(new Set(services.map(service => service.code)).size, 2);
    console.log('PASS duplicação de serviço editável');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
