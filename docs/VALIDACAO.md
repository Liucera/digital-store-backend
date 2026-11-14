# Roteiro de validação

Este documento reúne o roteiro de conferência e os resultados efetivamente obtidos em 14/11/2026.

## Preparação

1. Instalar Node.js 22.12 ou superior e MySQL 8.4.
2. Executar `npm ci`, configurar `.env` e gerar `JWT_SECRET`.
3. Executar `npm run db:create` e `npm run db:migrate`.
4. Configurar banco exclusivo terminado em `_test`, executar `npm run db:create:test` e `npm test`.
5. Iniciar a API com `npm run dev` e abrir `/docs`.

## Funcionalidades a conferir

| Grupo | Verificações |
| --- | --- |
| Usuários | Cadastro 201, consulta 200 sem hash, atualização 204, exclusão 204, e-mail duplicado 400 e senha confirmada |
| JWT | Login 200, credenciais inválidas 400, token ausente/inválido/expirado 401 e conta removida sem acesso |
| Autorização | Alteração/exclusão de outro usuário 403 |
| Categorias | CRUD, slug duplicado, defaults, `use_in_menu`, seleção de campos e paginação |
| Produtos | CRUD, campos obrigatórios, preços e estoque válidos, defaults e slug duplicado |
| Relações | Categorias existentes, opções e imagens; rejeição de IDs de outro produto |
| Buscas | Texto, categorias, intervalo de preço, opções, combinação de filtros e total sem duplicação |
| Paginação | Padrão 12, páginas, resultados vazios e `limit=-1` ignorando `page` |
| Imagens | PNG/JPEG real em base 64, URL acessível, limite 5 MB, base 64 inválido e tipos incompatíveis |
| Atualização | Adicionar, alterar e excluir itens; preservar omitidos; esvaziar vínculos com `category_ids: []` |
| Transações | Operação inválida sem alterações parciais e sem arquivos novos órfãos |
| Exclusão | Remover produto e relações; preservar produto ao remover categoria |
| HTTP | Status corretos, respostas 204 sem corpo, JSON inválido 400, corpo excessivo 413 e rota inexistente 404 |
| Documentação | OpenAPI válido e Swagger cobrindo todos os 15 endpoints |
| Banco | Seis migrations aplicadas, FKs, índices, unicidade, timestamps e reversão controlada |

## Segurança do ambiente de testes

O banco principal e o banco de testes devem ter nomes diferentes. A suíte pode apagar os registros do banco de testes. Preserve dados reais e utilize diretório temporário separado para imagens. Para conferir reversão de migrations, utilize um banco descartável: esse procedimento remove tabelas e dados.

## Registro de execução

Código verificado: [`1d68b4c`](https://github.com/Liucera/digital-store-backend/commit/1d68b4ce3be2bad6af7dd6006d7f640c3d999809). As datas e horas abaixo usam America/Sao_Paulo, UTC−3.

| Execução | Ambiente ou fluxo | Resultado observado |
| --- | --- | --- |
| 14/11/2026 às 17:50:41 a 17:50:47 | Node.js v24.22.1, npm 11.9.0, MySQL 8.4.13; Jest/Supertest | **31 testes aprovados**, sem falhas nem pendentes; saída 0 |
| 14/11/2026 às 18:57:41 a 18:58:05 | Swagger UI no Chromium; API Express e MySQL real | **23 requisições capturadas**, cobrindo as 15 operações |
| Mesma execução do Swagger | Cadastro, consulta, atualização e exclusão de usuário, categoria e produto | Status 200, 201 e 204; novos dados conferidos por GET após atualização |
| Mesma execução do Swagger | Catálogo sem token e token de conta excluída | Status 401 em ambos os casos |
| Mesma execução do Swagger | Consultas após exclusão | Status 404 para usuário, categoria e produto |
| Mesma execução do Swagger | Encerramento | Registros fictícios excluídos; nenhum erro JavaScript não tratado na página |

O [índice das evidências](evidencias/README.md) contém todas as capturas e suas legendas. A [saída real do Jest](evidencias/testes-jest.txt), o [resumo dos testes](evidencias/resumo-testes.json) e o [registro do Swagger](evidencias/execucao-swagger.json) permitem conferir os resultados e os horários. Os hashes SHA256 vinculam cada registro à sua imagem.

As imagens mostram **Request URL** e **Server response** da requisição executada, sem usar **Example Value** como prova. São capturas diretas do navegador. O recorte do login omite o corpo com JWT; as demais imagens evitam o curl com Authorization. Os dados de usuário e catálogo são fictícios, criados apenas para teste. Nenhuma credencial do ambiente está incluída.

As seis migrations também foram aplicadas, revertidas e reaplicadas em banco descartável na conferência anterior de 14/11/2026. O teste de upload utiliza um PNG válido de exatamente 5 MB; arquivo um byte acima do limite é recusado. A suíte inclui JSON acima de 10 MB, substituição/exclusão de arquivos e rollback após salvar uma imagem nova.

## Dependências

A auditoria de dependências de execução retornou **zero vulnerabilidades**. A auditoria completa registrou cinco ocorrências de severidade baixa na cadeia de desenvolvimento do Jest, decorrentes de um único aviso sobre `deepmerge` 4.3.1, sem versão corrigida publicada na consulta de 14/11/2026 ([GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)). Não há ocorrências moderadas, altas ou críticas. O projeto não utiliza `deepmerge` no código da API. As dependências estão fixadas no lockfile; atualizações devem passar pela suíte antes de serem adotadas.
