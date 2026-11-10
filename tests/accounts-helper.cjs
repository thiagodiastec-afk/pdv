const assert = require('node:assert/strict');

const managerPassword = 'gerente-teste-1';

async function createUser(page, name, password, role) {
  await page.getByRole('button', { name: 'Usuários', exact: true }).click();
  await page.getByLabel('Nome do usuário').fill(name);
  if (role) await page.getByLabel('Função').selectOption(role);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Salvar usuário' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}

async function authenticate(page, name, password, button = 'Entrar') {
  await page.getByLabel('Usuário', { exact: true }).selectOption({ label: name });
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: button, exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}

async function approve(page, name = 'Gerente teste', password = managerPassword) {
  await page.getByRole('heading', { name: 'Autorização do gerente' }).waitFor();
  await authenticate(page, name, password, 'Autorizar');
}

module.exports = { createUser, authenticate, approve, managerPassword };
