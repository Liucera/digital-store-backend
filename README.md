# Digital Store — Back-end

API REST da atividade de Back-end da Geração Tech 4.0, conforme o [escopo oficial da Digital College](https://github.com/digitalcollegebr/projeto-backend). Entrega: link do repositório GitHub até **20/11/2026**.

[Repositório de entrega](https://github.com/Liucera/digital-store-backend) · [Baixar projeto em ZIP](https://github.com/Liucera/digital-store-backend/archive/refs/heads/main.zip)

O projeto usa Node.js, Express, Dotenv, Nodemon, MySQL, Sequelize, JWT, bcrypt e Jest. Disponibiliza CRUD de usuários, categorias e produtos, imagens, opções, filtros e documentação Swagger/OpenAPI. A estrutura separa rotas, controladores, serviços e modelos.

## Preparar o ambiente

Requisitos: **Node.js 22.12 ou superior**, npm e **MySQL 8.4** em execução. Abra a pasta do projeto no VS Code, na mesma pasta do `package.json`.

No seu computador, a pasta indicada é `E:\Geração Tech 4.0\Digital Store Backend`. No terminal **PowerShell** do VS Code:

```powershell
cd "E:\Geração Tech 4.0\Digital Store Backend"
```

No **CMD**, use `cd /d "E:\Geração Tech 4.0\Digital Store Backend"`. Ao extrair o pacote, confira que `package.json` está diretamente nessa pasta.

Instale as versões registradas no projeto:

```bash
npm ci
```

Na primeira configuração, copie o arquivo de exemplo. No **PowerShell**:

```powershell
Copy-Item .env.example .env
```

No **Prompt de Comando (CMD)**:

```bat
copy .env.example .env
```

No **Linux/macOS**:

```bash
cp .env.example .env
```

Se `.env` já estiver configurado, preserve o arquivo. Edite as credenciais do seu MySQL e gere uma chave para `JWT_SECRET`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado para `JWT_SECRET` no `.env`. Não publique esse arquivo.

| Variável | Uso |
| --- | --- |
| `NODE_ENV` | `development`, `test` ou `production` |
| `HOST` / `PORT` | Endereço da API; padrão `127.0.0.1:3001` |
| `DB_HOST` / `DB_PORT` | Endereço e porta do MySQL |
| `DB_USER` / `DB_PASSWORD` | Credenciais do MySQL |
| `DB_NAME` | Banco principal |
| `DB_NAME_TEST` | Banco exclusivo dos testes; diferente do principal e terminado em `_test` |
| `JWT_SECRET` | Chave privada de pelo menos 32 caracteres |
| `JWT_EXPIRES_IN` | Validade do token; padrão `1h` |
| `UPLOAD_DIR` | Diretório de imagens; opcional, padrão `uploads/` |
| `PUBLIC_BASE_URL` | URL pública da API para gerar URLs absolutas de imagens; opcional |

O usuário MySQL precisa ter permissão para criar os bancos e executar as migrations. Em um ambiente com permissões restritas, solicite ao administrador a criação dos bancos e a concessão das permissões necessárias.

Crie o banco, aplique as migrations e inicie a API:

```bash
npm run db:create
npm run db:migrate
npm run dev
```

`npm start` inicia sem o monitoramento do Nodemon. `npm run db:undo` desfaz a última migration: use somente quando quiser reverter essa alteração.

- API: <http://127.0.0.1:3001>.
- Swagger: <http://127.0.0.1:3001/docs>.
- OpenAPI JSON: <http://127.0.0.1:3001/docs/openapi.json>.

O projeto fornece uma API. A interface para explorar os endpoints é `/docs`. Mantenha o terminal aberto durante o uso.

### MySQL com Docker (opcional)

O arquivo `compose.yml` disponibiliza somente o banco. A API continua sendo executada pelos comandos npm. Consulte o [guia do banco](docs/BANCO.md) para configurar e iniciar esse serviço.

## Estrutura

```text
src/
  config/               Ambiente e conexão
  controllers/          Entrada e saída HTTP
  database/migrations/  Criação e reversão das tabelas
  docs/                 Contrato OpenAPI
  middleware/           Autenticação e tratamento de erros
  models/               Modelos e associações Sequelize
  routes/               Rotas da API
  services/             Regras de negócio e consultas
  utils/                Validações e imagens
  app.js                Aplicação Express
  server.js             Servidor HTTP
scripts/                Comandos do banco
tests/                  Testes Jest/Supertest
uploads/                Imagens recebidas pela API
```

## Banco de dados

As migrations criam seis tabelas: `users`, `categories`, `products`, `product_images`, `product_options` e `product_categories`. A tabela `SequelizeMeta` controla as migrations aplicadas. Usuários, categorias e produtos possuem `created_at` e `updated_at`.

As senhas são armazenadas como hash bcrypt. E-mails e slugs possuem restrições de unicidade. Produtos têm imagens e opções em relações um para muitos; produtos e categorias se relacionam por uma tabela de vínculos com chave composta. As chaves estrangeiras impedem referências inexistentes. Excluir um produto remove suas relações; excluir uma categoria preserva os produtos e remove somente os vínculos correspondentes.

Os preços usam `FLOAT`, conforme a exigência do enunciado. Opções são armazenadas como valores separados por vírgula e retornam como listas na API. As alterações de produtos e suas relações utilizam transações.

## Endpoints

Envie corpos JSON com `Content-Type: application/json`. Nas operações protegidas, use `Authorization: Bearer <token>`.

| Método | Caminho | Operação | JWT | Sucesso |
| --- | --- | --- | --- | --- |
| POST | `/v1/user` | Cadastrar usuário | Não | 201 |
| POST | `/v1/user/token` | Gerar token | Não | 200 |
| GET | `/v1/user/:id` | Consultar usuário | Não | 200 |
| PUT | `/v1/user/:id` | Atualizar o próprio usuário | Sim | 204 |
| DELETE | `/v1/user/:id` | Excluir o próprio usuário | Sim | 204 |
| GET | `/v1/category/search` | Buscar categorias | Não | 200 |
| GET | `/v1/category/:id` | Consultar categoria | Não | 200 |
| POST | `/v1/category` | Cadastrar categoria | Sim | 201 |
| PUT | `/v1/category/:id` | Atualizar categoria | Sim | 204 |
| DELETE | `/v1/category/:id` | Excluir categoria | Sim | 204 |
| GET | `/v1/product/search` | Buscar produtos | Não | 200 |
| GET | `/v1/product/:id` | Consultar produto | Não | 200 |
| POST | `/v1/product` | Cadastrar produto | Sim | 201 |
| PUT | `/v1/product/:id` | Atualizar produto | Sim | 204 |
| DELETE | `/v1/product/:id` | Excluir produto | Sim | 204 |

Respostas `204` não têm corpo. Dados inválidos e duplicados retornam `400`; token ausente, inválido ou expirado retorna `401`; tentativa de alterar ou excluir outro usuário retorna `403`; recurso inexistente retorna `404`. Corpos acima de 10 MB retornam `413`. Erros inesperados retornam `500`, sem detalhes internos. Os erros têm o formato `{"message":"Descrição do erro."}`.

A consulta pública de usuário retorna somente `id`, `firstname`, `surname` e `email`, conforme o contrato acadêmico. Senhas e hashes nunca são retornados. O escopo não define papéis administrativos: qualquer usuário autenticado pode gerenciar o catálogo.

### Primeiro teste pelo Swagger

1. Em `POST /v1/user`, informe `firstname`, `surname`, `email`, `password` e `confirmPassword`. Os dois campos de senha devem ser iguais; o mínimo é seis caracteres.
2. Em `POST /v1/user/token`, envie o e-mail e a senha cadastrados.
3. Copie o valor de `token`, clique em **Authorize** e cole somente esse valor. O Swagger acrescenta `Bearer`.
4. Cadastre uma categoria e anote o ID retornado.
5. Cadastre um produto, usando esse ID em `category_ids`. Os IDs dos exemplos são ilustrativos; utilize os retornados pelo seu banco.
6. Consulte, atualize e exclua os registros. Confira as respostas `200`, `201` e `204`.

Exemplo de produto válido, sem imagem obrigatória:

```json
{
  "enabled": true,
  "name": "Camiseta preta",
  "slug": "camiseta-preta",
  "stock": 10,
  "description": "Camiseta preta de manga curta.",
  "price": 79.9,
  "price_with_discount": 69.9,
  "category_ids": [],
  "options": [
    {
      "title": "Tamanho",
      "shape": "square",
      "radius": 4,
      "type": "text",
      "values": ["P", "M", "G"]
    }
  ]
}
```

### Buscas

As buscas retornam `{data,total,limit,page}`. O padrão é `limit=12&page=1`. `limit=-1` retorna todos os registros, ignora `page` e informa `page: 1`.

| Busca | Parâmetros |
| --- | --- |
| Categorias | `limit`, `page`, `fields=name,slug`, `use_in_menu=true` |
| Produtos | `limit`, `page`, `fields=name,images,price`, `match`, `category_ids`, `price-range`, `option[ID]` |

`match` pesquisa nome ou descrição. `category_ids=1,2` aceita associação com qualquer uma das categorias informadas. `price-range=50-100` filtra `price`, incluindo os limites. `option[45]=P,M` usa o ID da opção e aceita qualquer um desses valores. Filtros de opções diferentes são combinados. Campos inexistentes e parâmetros inválidos retornam `400`.

Exemplos:

```text
/v1/category/search?use_in_menu=true&fields=name,slug
/v1/product/search?match=camiseta&price-range=50-100
/v1/product/search?category_ids=1,2&option%5B45%5D=P,M
```

### Imagens, opções e atualização

O cadastro aceita `images` com `type` igual a `image/png`, `image/jpeg` ou `image/jpg` e `content` em base64 puro, sem o prefixo `data:`. Cada imagem deve ter até 5 MB. O total do corpo JSON continua limitado a 10 MB. Arquivos são salvos em `uploads/`; `images[].content` retorna `/uploads/<arquivo>` ou uma URL absoluta quando `PUBLIC_BASE_URL` estiver configurada.

No `PUT`, campos omitidos são preservados. Para imagens e opções, envie `id` para alterar um item, `{ "id": 1, "deleted": true }` para excluí-lo e um objeto sem ID para adicionar outro. IDs pertencentes a outro produto são rejeitados. Uma URL retornada para uma imagem existente pode ser reenviada com seu ID para mantê-la; URLs externas não são baixadas. `category_ids`, quando informado, substitui todos os vínculos; `[]` remove esses vínculos.

Opções aceitam `values` ou o alias `value`, conforme os exemplos oficiais. Informe somente um deles. `radius` aceita inteiro não negativo ou texto como `"4px"`. A resposta utiliza `values` como lista e `radius` como inteiro. Cada valor é um texto sem vírgulas, pois o banco armazena a lista em uma coluna CSV.

## Testes e conferência

Configure um `DB_NAME_TEST` exclusivo, diferente do principal e terminado em `_test`. Crie-o e execute:

```bash
npm run db:create:test
npm test
```

Os testes aplicam migrations e utilizam MySQL real. Os dados de teste são apagados entre casos; nunca aponte `DB_NAME_TEST` para um banco com dados que deseja preservar. As imagens de teste devem usar diretório temporário separado dos uploads da aplicação.

O fluxo do GitHub Actions executa a suíte com Node.js 22 e MySQL 8.4 a cada push ou pull request. O `package-lock.json` registra as versões instaladas. O override de `uuid` mantém uma versão corrigida e compatível com as APIs utilizadas pelo Sequelize.

O [roteiro de validação](docs/VALIDACAO.md) detalha as verificações. A [matriz de requisitos](docs/MATRIZ-REQUISITOS.md) relaciona o escopo aos módulos e critérios de avaliação.

Validação em 14/11/2026: **31 testes aprovados com MySQL 8.4.13**, migrations reversíveis e fluxo completo conferido no Swagger pelo Chromium. O registro detalha o ambiente e os limites da conferência.

## Decisão sobre autenticação

O enunciado contém uma divergência: os contratos individuais dos endpoints protegidos determinam **401** para token ausente ou inválido, enquanto a seção 05, requisito 02, informa **400**. A API segue os contratos individuais e retorna **401**. Dados inválidos e credenciais incorretas no login retornam **400**.

Cadastro e geração de token são públicos para permitir o primeiro acesso. Os demais `POST`, `PUT` e `DELETE` exigem JWT. A restrição de titularidade nos dados do usuário acrescenta autorização: um usuário não pode alterar ou excluir a conta de outro.

## Organização e entrega

O [cronograma](docs/CRONOGRAMA.md) acompanha a entrega até **20/11/2026**. O [guia de entrega](docs/ENTREGA.md) traz os passos para publicação do repositório e conferência final.

Participante: **Arlindo Barroso**. Caso a entrega seja realizada em equipe, informe os nomes dos demais integrantes, respeitando o limite de três pessoas.
