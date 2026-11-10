const { createUser, authenticate, approve, managerPassword } = require('./accounts-helper.cjs');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const url = process.env.PDV_TEST_URL || 'http://127.0.0.1:4173/';
const key = 'cromapdv_snapshot_v1';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const page = await browser.newPage();
    await page.goto(url);
    await page.getByLabel('Nome comercial').fill('Oficina Teste');
    await page.getByLabel(/Usar dados de demonstração/).check();
    await page.getByRole('button', { name: 'Começar' }).click();
    await page.getByRole('heading', { name: 'Configure seu negócio' }).waitFor({ state: 'hidden' });

    await page.evaluate(storageKey => {
      const snapshot = JSON.parse(localStorage.getItem(storageKey));
      const product = { ...snapshot.products[0], name: 'Peça de teste', price: 10, stock: 8 };
      snapshot.products[0] = product;
      snapshot.movements.unshift({
        id: 'test-sale', type: 'VENDA', amount: 18, discount: 2, paymentMethod: 'DINHEIRO',
        description: 'Venda sem NFC-e', createdAt: '04/11/2026 10:00:00', operatorName: 'Teste',
        customerName: 'João Silva', customerCpfCnpj: '123.456.789-00',
        items: [{ product, quantity: 2 }],
      });
      localStorage.setItem(storageKey, JSON.stringify(snapshot));
    }, key);
    await page.reload();
    await createUser(page, 'Gerente teste', managerPassword);
    await createUser(page, 'Segunda gerente', 'outra-senha-2', 'manager');
    await createUser(page, 'Operador teste', 'operador-123', 'operator');
    await page.getByRole('button', { name: 'Trocar usuário' }).click();
    await authenticate(page, 'Operador teste', 'operador-123');
    assert(await page.getByRole('button', { name: 'Catálogo', exact: true }).isDisabled());
    await page.getByRole('button', { name: 'Vendas', exact: true }).click();
    const sale = page.getByRole('button', { name: /João Silva/ });
    const customer = page.getByLabel('Cliente ou CPF/CNPJ');
    await customer.fill('nao-existe');
    assert.equal(await sale.count(), 0);
    await customer.fill('joao');
    await sale.waitFor();
    await page.getByLabel('Data inicial').fill('2026-11-05');
    assert.equal(await sale.count(), 0);
    await page.getByLabel('Data inicial').fill('2026-11-04');
    await sale.click();

    await page.evaluate(() => {
      window.print = () => { window.testReceipt = document.querySelector('#sale-receipt-print')?.textContent; };
    });
    const receipt = page.locator('#sale-receipt-print');
    assert(!(await receipt.isVisible()));
    await page.emulateMedia({ media: 'print' });
    assert(await receipt.isVisible());
    assert.equal(await page.locator('header').evaluate(header => getComputedStyle(header).visibility), 'hidden');
    await page.emulateMedia({ media: 'screen' });
    await page.getByRole('button', { name: 'Imprimir comprovante' }).click();
    assert.match(await page.evaluate(() => window.testReceipt), /SEM VALOR FISCAL/);

    await page.getByRole('button', { name: 'Registrar devolução' }).click();
    await page.getByLabel('Quantidade a devolver de Peça de teste').fill('1');
    await page.getByLabel('Motivo da devolução').fill('Teste de devolução parcial');
    await page.getByRole('button', { name: 'Confirmar devolução' }).click();
    await page.getByRole('heading', { name: 'Autorização do gerente' }).waitFor();
    assert.equal(await page.getByRole('option', { name: 'Operador teste' }).count(), 0);
    await page.getByLabel('Usuário', { exact: true }).selectOption({ label: 'Segunda gerente' });
    await page.getByLabel('Senha', { exact: true }).fill(managerPassword);
    await page.getByRole('button', { name: 'Autorizar', exact: true }).click();
    await page.getByText('Usuário ou senha inválidos.').waitFor();
    await approve(page, 'Segunda gerente', 'outra-senha-2');
    await page.getByText('Devolução parcial', { exact: true }).waitFor();
    const partial = await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)), key);
    assert.equal(partial.movements.find(movement => movement.returnSaleId === 'test-sale').amount, 9);
    assert.equal(partial.movements[0].authorizedBy, 'Segunda gerente');
    assert.equal(partial.movements[0].operatorName, 'Operador teste');
    assert.equal(partial.products[0].stock, 9);

    await page.getByRole('button', { name: 'Registrar devolução' }).click();
    await page.getByRole('button', { name: 'Selecionar todos os itens restantes' }).click();
    await page.getByLabel('Motivo da devolução').fill('Teste de devolução total');
    await page.getByRole('button', { name: 'Confirmar devolução' }).click();
    await approve(page);
    await page.getByText('Devolução total', { exact: true }).waitFor();
    const full = await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)), key);
    assert.equal(full.products[0].stock, 10);
    assert.equal(full.movements.filter(movement => movement.returnSaleId === 'test-sale')
      .reduce((total, movement) => total + movement.amount, 0), 18);
    console.log('PASS busca, impressão de comprovante e devolução parcial e total');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
