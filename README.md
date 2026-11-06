# CromaPDV

O fluxo fiscal é uma demonstração. Use dados fictícios durante os testes. A emissão real depende de uma integração com a SEFAZ.

## Rodar localmente no Windows

Com Node.js 24 e Microsoft Edge, abra um terminal na pasta do repositório e execute:

```powershell
npx --yes bun install --frozen-lockfile
npx --yes bun run lint
npx --yes bun run build
npx --yes bun run preview --host 127.0.0.1 --port 4173 --strictPort
```

Abra http://127.0.0.1:4173 no navegador. O PDV guarda dados por endereço do navegador. Use uma janela InPrivate para testar com dados isolados.

## Testes automatizados

Com a prévia aberta, rode em outro terminal:

```powershell
node tests/pos.cjs
```

Os testes usam um perfil temporário do Edge. Eles verificam dinheiro insuficiente, venda sem nota, persistência, estoque, venda simulada, concorrência entre abas, cancelamento, código de barras digitado e falha de gravação.

## Testes com equipamentos e instalação

1. **Leitor físico**. Cadastre um produto com o código da embalagem. Pressione F3, escaneie com o leitor configurado para enviar Enter e confirme que o produto correto entrou uma vez no carrinho.
2. **Impressora de 80 mm**. Gere uma NFC-e simulada e use a opção de imprimir. Confira se os valores cabem no papel e se o aviso de simulação fica legível.
3. **Aplicativo instalável pelo Edge**. Instale pelo menu do Edge, abra o atalho, faça uma venda de teste, feche e reabra para conferir os dados. Após uma primeira abertura conectada, teste também em modo offline.
4. **Instalador Windows**. Gere os arquivos com `node scripts/build_installers.mjs` após instalar as dependências. Em uma máquina ou perfil de testes, rode o instalador gerado em `public/instalador`. Confira o atalho, a abertura, a finalização de uma venda e a persistência após reabrir. O gerador substitui os arquivos locais do instalador.
5. **Caixa e pagamentos**. Teste dinheiro com troco, PIX, cartão, desconto, suprimento e sangria. Confira os movimentos e os valores. Os meios de pagamento são registrados no PDV. O recebimento deve ser conferido no terminal de pagamento.
6. **SEFAZ em homologação**. Esta etapa depende da implementação da integração fiscal. Com ela disponível, valide autorização, rejeição, contingência, cancelamento e leitura do QR Code fiscal no ambiente de homologação.
