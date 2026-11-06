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
