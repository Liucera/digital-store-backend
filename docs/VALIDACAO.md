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

| Data | Ambiente | Comando ou fluxo | Resultado |
| --- | --- | --- | --- |
| 14/11/2026 | Node.js 24.22.1, npm 11.9.0, MySQL 8.4.13 | `db:create`, `db:migrate`, `db:create:test` | Bancos criados e seis migrations aplicadas |
| 14/11/2026 | npm e lockfile | `npm ci` | Instalação limpa concluída; suíte executada novamente após a instalação |
| 14/11/2026 | Jest/Supertest e MySQL real | `npm test` | **31 testes passaram**, incluindo CRUD, autenticação, autorização, filtros, relações, imagens e rollback |
| 14/11/2026 | Banco descartável separado | Seis migrations up → down → up | Seis tabelas revertidas e recriadas; nova aplicação sem migrations pendentes |
| 14/11/2026 | Swagger Parser | Validação de `src/docs/openapi.json` | OpenAPI válido com 15 operações |
| 14/11/2026 | Chromium e Playwright | Cadastro → login → autorização → categoria → produto → busca pelo Swagger | Persistência e resposta conferidas; nenhum erro de JavaScript na página |
| 14/11/2026 | Chromium e API HTTP | Exclusão dos registros temporários do fluxo | Respostas 204 sem corpo |
| 14/11/2026 | Node.js | Verificação de sintaxe | 30 arquivos JavaScript válidos |

A captura [Swagger no navegador](evidencias/swagger.png) registra a documentação e uma consulta executada. As requisições de teste usam dados fictícios. Nenhum segredo do ambiente está incluído no projeto.

O teste do limite de upload utiliza um PNG com chunk tEXt e CRC válidos, de exatamente 5 MB; a mesma imagem com um byte além do limite é recusada. Também foram verificados JSON acima de 10 MB, substituição/exclusão de arquivos e rollback após salvar uma imagem nova.

## Dependências

A auditoria de dependências de execução retornou **zero vulnerabilidades**. A auditoria completa registrou cinco ocorrências de severidade baixa na cadeia de desenvolvimento do Jest, decorrentes de um único aviso sobre `deepmerge` 4.3.1, sem versão corrigida publicada na consulta de 14/11/2026 ([GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)). Não há ocorrências moderadas, altas ou críticas. O projeto não utiliza `deepmerge` no código da API. As dependências estão fixadas no lockfile; atualizações devem passar pela suíte antes de serem adotadas.
