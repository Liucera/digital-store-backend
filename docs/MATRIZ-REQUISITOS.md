# Matriz de requisitos

Referência: [escopo oficial](https://github.com/digitalcollegebr/projeto-backend). A tabela relaciona cada requisito à estrutura do projeto e ao modo de conferência. O resultado da validação deve ser consultado no registro de execução.

| Seção / requisito | Implementação prevista | Conferência |
| --- | --- | --- |
| 01 /01 — Usuários | Migration e modelo `User`, hash bcrypt e timestamps | Estrutura MySQL, cadastro e comparação do hash |
| 01 /02 — Categorias | Migration e modelo `Category`, nome/slug e menu | Defaults, unicidade e timestamps |
| 01 /03 — Produtos | Migration e modelo `Product`, preços FLOAT e estoque | Campos, defaults e timestamps |
| 01 /04 — Imagens | Migration e modelo `ProductImage`, FK e caminho | Associação, upload e exclusão |
| 01 /05 — Opções | Migration e modelo `ProductOption`, ENUM, raio e CSV | Persistência e serialização da lista |
| 01 /06 — Produto/categoria | `ProductCategory`, FKs e chave composta | Associação muitos para muitos |
| 02 /01 — Consultar usuário | `GET /v1/user/:id` |200,404 e ausência de senha |
| 02 /02 — Cadastrar usuário | `POST /v1/user` |201 e 400 |
| 02 /04 — Atualizar usuário | `PUT /v1/user/:id` |204 sem corpo,400,401,403 e 404 |
| 02 /05 — Excluir usuário | `DELETE /v1/user/:id` |204 sem corpo,401,403 e 404 |
| 03 /01 — Buscar categorias | `GET /v1/category/search` | Paginação, fields e use_in_menu |
| 03 /02 — Consultar categoria | `GET /v1/category/:id` |200 e 404 |
| 03 /03 — Cadastrar categoria | `POST /v1/category` |201,400 e 401 |
| 03 /04 — Atualizar categoria | `PUT /v1/category/:id` |204,400,401 e 404 |
| 03 /05 — Excluir categoria | `DELETE /v1/category/:id` |204,401 e 404 |
| 04 /01 — Buscar produtos | `GET /v1/product/search` | Todos os filtros, fields, paginação e total |
| 04 /02 — Consultar produto | `GET /v1/product/:id` | Dados e relações,200 e 404 |
| 04 /03 — Cadastrar produto | `POST /v1/product` |201, validações, transação e 401 |
| 04 /04 — Atualizar produto | `PUT /v1/product/:id` |204, imagens/opções/categorias e rollback |
| 04 /05 — Excluir produto | `DELETE /v1/product/:id` |204 e limpeza de relações/arquivos |
| 05 /01 — Gerar JWT | `POST /v1/user/token` |200 com token e 400 em credenciais inválidas |
| 05 /02 — Validar JWT | Middleware nas escritas protegidas | Assinatura/expiração,401 e usuário existente |
| Apresentação — Código | Rotas, controllers, services, models e utilitários | Revisão de organização e regras de negócio |
| Apresentação — Migrations | Seis migrations e registro `SequelizeMeta` | Aplicação/reversão em banco descartável |
| Apresentação — Documentação | README, OpenAPI 3 e Swagger UI | Setup limpo e exploração de `/docs` |
| Apresentação — Testes | Jest/Supertest com MySQL real | `npm test` |
| Apresentação — Entrega | Repositório GitHub e integrantes | Acesso pelo avaliador até 20/11/2026 |

A numeração original da seção 02 pula o requisito 03. O último requisito da seção 04 está intitulado como atualização no texto original, mas especifica `DELETE`; a API segue o método e o caminho descritos. A divergência 401/400 da seção 05 está documentada no README.
