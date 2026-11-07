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

## Configurar o negócio

Na primeira abertura, informe o nome comercial e selecione Comércio, Serviços ou Operação mista. Escolha os dados de demonstração apenas para testar. Uma instalação nova sem demonstração começa com catálogo e caixa vazios.

Cadastre os itens em **Catálogo** e abra o caixa em **F7**. No perfil misto, selecione Produto ou Serviço ao cadastrar cada item. Produtos baixam estoque. Serviços podem ser cobrados na mesma venda e ficam fora da simulação de NFC-e. Use **Meu negócio** no topo para editar o perfil. O catálogo existente é preservado ao trocar de perfil.

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

## Preparação fiscal para São Paulo

No menu **Configuração fiscal**, o perfil Comércio abre Mercadorias e o perfil Serviços abre NFS-e. O perfil Operação mista permite alternar entre os dois cadastros. O cadastro de serviços guarda município, código IBGE, inscrição municipal e emissor previsto. Confirme esses dados e o emissor aplicável com a contabilidade do cliente.

Ao finalizar um atendimento nos perfis Serviços ou Operação mista, escolha **Balcão** ou **Conserto ou assistência técnica**. O histórico guarda a escolha e identifica mercadorias e serviços dentro da mesma cobrança. A classificação do atendimento ainda não cria uma ordem de serviço nem gera documentos fiscais.

### Próxima etapa da integração

- Mercadorias. Integrar NFC-e de balcão e NF-e modelo 55 para as operações aplicáveis, com autorização, rejeição, consulta e cancelamento.
- Serviços. Integrar o emissor de NFS-e aplicável ao município e ao prestador.
- Assistência técnica. Vincular a ordem de serviço e os documentos de peças, mão de obra e movimentação do equipamento quando exigidos.
- Homologação. Validar cada fluxo com um emitente habilitado. Usar armazenamento seguro para credenciais e habilitar produção somente após os testes.

Referências oficiais: [NFC-e em São Paulo](https://portal.fazenda.sp.gov.br/servicos/nfce/), [Portaria CAT 56/2021](https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-CAT-56-de-2021.aspx) e [documentação nacional da NFS-e](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/documentacao-atual).

## Preencher o catálogo a partir de fontes existentes

- Produtos. Em **Catálogo → Cadastrar item**, carregue o XML de uma NF-e do fornecedor. Se houver vários itens, escolha um deles ou digite o GTIN presente no arquivo. O PDV copia descrição, GTIN, NCM, CEST e a unidade quando suportada. Revise os dados e preencha preço de venda e estoque. O CFOP do fornecedor não é copiado.
- Serviços. Selecione **Serviço** e busque pelo nome ou código na lista nacional. O código escolhido e a descrição sugerida podem ser alterados. A referência incluída no aplicativo é a [lista publicada pelo Portal Nacional da NFS-e](https://www.gov.br/nfse/pt-br/mei-e-demais-empresas/codigos-de-tributacao-nacional-nbs), consultada em 6 de novembro de 2026.
- Para ajustar depois, abra o item em **Editar**. Sem XML, o produto pode ser cadastrado manualmente. A consulta a uma base externa por GTIN depende de uma integração futura.

## Rotinas de operação

- **Caixa por turno.** Em F7, informe o saldo inicial na abertura. No fechamento, informe o dinheiro contado. Confira o saldo esperado e a diferença em Fechamentos registrados.
- **Backup.** Exporte o JSON e guarde em local seguro. Para restaurar em outro terminal, configure o perfil inicial, abra Backup, selecione o arquivo e confirme a substituição dos dados locais.
- **Catálogo.** Use a importação em lote para revisar e cadastrar itens de uma NF-e. O preço de venda e o estoque são preenchidos durante a revisão. O comando de duplicação abre uma cópia editável de um serviço.
- **Ordens de serviço.** Nos perfis Serviços ou Operação mista, cadastre cliente, equipamento e orçamento. Adicione peças e mão de obra do catálogo, marque a aprovação e envie para o caixa. A venda concluída fica vinculada à ordem.
- **Vendas.** Busque por período ou cliente, abra a venda e imprima o comprovante sem valor fiscal. Devoluções totais e parciais ficam disponíveis para vendas sem nota simulada. Para vendas com nota simulada, use o cancelamento no fluxo fiscal.

### Testes adicionais no Edge

Com a prévia aberta, execute:

```powershell
node tests/operations.cjs
node tests/catalog-batch.cjs
node tests/sales-history.cjs
```
