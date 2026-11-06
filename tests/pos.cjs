const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const key = 'cromapdv_snapshot_v1';
(async () => {
  const browser = await chromium.launch({channel:'msedge'});
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const url = process.env.PDV_TEST_URL || 'http://127.0.0.1:4173/';
    const load = async p => { await p.goto(url); await p.getByText(/Modo demonstração fiscal/).waitFor(); };
    const read = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
    const checkout = async p => { await p.getByRole('button',{name:/FINALIZAR VENDA \(F2\)/}).click(); await p.getByRole('button',{name:/CONFIRMAR VENDA/}).waitFor(); };
    const confirm = p => p.getByRole('button',{name:/CONFIRMAR VENDA/});
    await load(page);
    await checkout(page);
    const cash = page.locator('form input').first();
    await cash.fill('0');
    assert(await confirm(page).isDisabled(), 'dinheiro insuficiente deve bloquear');
    console.log('PASS pagamento em dinheiro insuficiente');
    await page.keyboard.press('Escape');
    await checkout(page);
    await confirm(page).click();
    await confirm(page).waitFor({state:'hidden'});
    let state = await read(page);
    assert.equal(state.cart.length,0);
    assert.equal(state.movements[0].description,'Venda sem NFC-e');
    assert.equal(state.movements[0].invoiceNumero,undefined);
    assert.equal(state.invoices.length,2);
    await page.reload();
    assert.deepEqual(await read(page),state);
    console.log('PASS venda sem NFC-e e persistência após recarregar');

    await page.evaluate(k => {
      const snapshot = JSON.parse(localStorage.getItem(k));
      const product = snapshot.products.find(p => p.stock > 0);
      product.stock = 1;
      snapshot.cart = [{product, quantity: 2}];
      localStorage.setItem(k,JSON.stringify(snapshot));
    },key);
    await page.reload();
    await checkout(page);
    await confirm(page).click();
    await page.getByText(/Estoque insuficiente/).waitFor();
    assert.equal((await read(page)).cart[0].quantity,2);
    console.log('PASS bloqueio de estoque insuficiente ao finalizar');

    await page.evaluate(k => {
      const snapshot = JSON.parse(localStorage.getItem(k));
      snapshot.cart[0].quantity = 1;
      localStorage.setItem(k,JSON.stringify(snapshot));
    },key);
    await page.reload();
    const stale = await context.newPage();
    await load(stale);
    state = await read(page);
    const productId = state.cart[0].product.id;
    await checkout(page);
    await page.getByRole('checkbox',{name:/NFC-e simulada/}).check();
    await confirm(page).click();
    await page.getByText('SIMULAÇÃO · SEM VALOR FISCAL').waitFor();
    const sold = await read(page);
    assert.equal(sold.products.find(p=>p.id===productId).stock,0);
    assert.equal(sold.storeConfig.proximoNumeroNfce,state.storeConfig.proximoNumeroNfce+1);
    await checkout(stale);
    await confirm(stale).click();
    await stale.getByText(/Dados atualizados em outra aba/).waitFor();
    assert.deepEqual(await read(page),sold);
    console.log('PASS venda simulada e proteção contra venda em aba desatualizada');

    await page.getByRole('button',{name:/Simular cancelamento/}).click();
    const reason = page.getByRole('button',{name:/Confirmar Estorno/i});
    await reason.click();
    await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).movements[0].type==='ESTORNO',key);
    const canceled = await read(page);
    assert.equal(canceled.products.find(p=>p.id===productId).stock,1);
    assert.equal(canceled.invoices[0].status,'CANCELADA');
    console.log('PASS cancelamento, estorno e reposição');

    await page.reload();
    const search = page.getByPlaceholder(/Buscar produto ou bipar/);
    const returned = canceled.products.find(p => p.id === productId);
    await search.fill('2*' + returned.barcode);
    await search.press('Enter');
    await page.getByText('Estoque insuficiente.').waitFor();
    assert.deepEqual(await read(page), canceled);
    await search.fill(returned.barcode);
    await search.press('Enter');
    await page.waitForFunction(k => JSON.parse(localStorage.getItem(k)).cart.length === 1, key);
    console.log('PASS código de barras e bloqueio de quantidade na busca');

    const beforeFailure = await read(page);
    await checkout(page);
    await page.evaluate(k => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (name === k) throw new DOMException('Armazenamento cheio', 'QuotaExceededError');
        return original.call(this, name, value);
      };
    }, key);
    await confirm(page).click();
    await page.getByText(/Não foi possível salvar os dados/).waitFor();
    assert(await confirm(page).isVisible());
    assert.deepEqual(await read(page), beforeFailure);
    console.log('PASS falha de gravação preserva carrinho, caixa e estoque');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
