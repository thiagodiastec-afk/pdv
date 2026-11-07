const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const url = process.env.PDV_TEST_URL || 'http://127.0.0.1:4173/';
const key = 'cromapdv_snapshot_v1';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1536, height: 900 } });
    const button = (name) => page.getByRole('button', { name, exact: typeof name === 'string' });
    const snapshot = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    await page.goto(url);
    await page.getByLabel('Nome comercial').fill('Assistência teste');
    await page.getByLabel('Nome do operador').fill('Operadora piloto');
    await page.getByRole('radio', { name: /Operação mista/ }).check();
    await page.getByLabel(/Usar dados de demonstração/).check();
    await button('Começar').click();
    await page.getByRole('heading', { name: 'Configure seu negócio' }).waitFor({ state: 'hidden' });
    const demo = await snapshot();
    // Use a closed register and an empty cart to exercise the opening flow.
    await page.evaluate(({ key, demo }) => localStorage.setItem(key, JSON.stringify({ ...demo, cart: [], registerOpen: false })), { key, demo });
    await page.reload();

    await button(/F7: Sangria/).click();
    await page.getByLabel('Saldo inicial (R$)').fill('30');
    await button('Reabrir Caixa').click();
    await button('Fechar Caixa').waitFor();
    await page.keyboard.press('Escape');

    await button('Ordens de serviço').click();
    await button('Nova ordem').click();
    await page.getByLabel('Cliente', { exact: true }).fill('Cliente piloto');
    await page.getByLabel('Equipamento').fill('Notebook teste');
    await page.getByLabel('Número de série').fill('NB-001');
    await page.getByLabel('Defeito relatado').fill('Equipamento sem vídeo');
    const product = demo.products.find(entry => entry.stock > 0);
    await page.getByLabel('Orçamento (R$)').fill(String(product.price));
    await page.getByLabel('Orçamento aprovado').check();
    await page.getByLabel('Item da ordem').selectOption(product.id);
    await button('Adicionar item à ordem').click();
    await button('Salvar ordem').click();
    await page.getByText(/OS nº 1 · Notebook teste/).waitFor();
    await page.reload();
    await button('Ordens de serviço').click();
    await button('Nova ordem').click();
    await page.getByLabel('Cliente', { exact: true }).fill('Segundo cliente');
    await page.getByLabel('Equipamento').fill('Segundo equipamento');
    await page.getByLabel('Defeito relatado').fill('Defeito de teste');
    await button('Salvar ordem').click();
    await page.getByText(/OS nº 2 · Segundo equipamento/).waitFor();
    await button('Enviar para o caixa').click();
    await page.getByText(/Ordem em cobrança.*Notebook teste/).waitFor();
    await button(/FINALIZAR VENDA \(F2\)/).click();
    await page.getByText(/Ordem de serviço.*Notebook teste/).waitFor();
    await button(/CONFIRMAR VENDA/).click();
    await button(/CONFIRMAR VENDA/).waitFor({ state: 'hidden' });
    const charged = await snapshot();
    assert.equal(charged.orders.find(order => order.number === 1).saleId, charged.movements[0].id);
    assert.equal(charged.movements[0].workOrderId, charged.orders.find(order => order.number === 1).id);
    assert.equal(charged.movements[0].operation, 'repair');
    assert.equal(charged.movements[0].customerName, 'Cliente piloto');
    assert.equal(charged.products.find(entry => entry.id === product.id).stock, product.stock - 1);
    console.log('PASS ordem aprovada, cobrança vinculada e baixa de estoque');

    await button(/F7: Sangria/).click();
    await page.getByLabel('Dinheiro contado (R$)').fill(String(31 + product.price));
    await button('Fechar Caixa').click();
    await button('Reabrir Caixa').waitFor();
    await page.keyboard.press('Escape');
    await page.reload();
    await page.getByText('Caixa Fechado', { exact: true }).waitFor();
    const closed = await snapshot();
    assert.equal(closed.cashClosings[0].expected, 30 + product.price);
    assert.equal(closed.cashClosings[0].difference, 1);
    assert.equal(closed.cashClosings[0].operatorName, 'Operadora piloto');
    console.log('PASS saldo inicial, fechamento, diferença e persistência');

    await button('Backup').click();
    const downloadEvent = page.waitForEvent('download');
    await button('Exportar backup').click();
    const download = await downloadEvent;
    const backup = await download.path();
    const restore = await browser.newPage();
    await restore.goto(url);
    await restore.getByLabel('Nome comercial').fill('Terminal novo');
    await restore.getByRole('button', { name: 'Começar' }).click();
    await restore.getByRole('button', { name: 'Backup', exact: true }).click();
    await restore.getByLabel('Arquivo de backup').setInputFiles(backup);
    restore.once('dialog', dialog => dialog.accept());
    await restore.getByRole('button', { name: 'Restaurar backup' }).click();
    await restore.getByText('Backup restaurado.').waitFor();
    const recovered = await restore.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.deepEqual(recovered, closed);
    console.log('PASS backup restaurado em outro perfil do navegador');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
