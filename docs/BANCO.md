# Banco de dados

O projeto utiliza MySQL 8.4 e Sequelize. As migrations são a fonte da estrutura do banco; iniciar a API não executa `sync` nem altera tabelas automaticamente.

## MySQL instalado

Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` e `DB_NAME_TEST` no `.env`. Com o servidor ativo:

```bash
npm run db:create
npm run db:migrate
npm run db:create:test
npm test
```

Os comandos de criação são seguros para bancos já existentes. As migrations pendentes são registradas em `SequelizeMeta`. `npm run db:undo` reverte a última migration; use em ambiente descartável ou com plano de recuperação, pois a reversão pode remover dados.

## MySQL com Docker Compose

É necessário ter Docker com o comando `docker compose` disponível. No `.env`, configure:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=coloque_uma_senha_local
DB_NAME=digital_store_backend
DB_NAME_TEST=digital_store_backend_test
```

Escolha sua senha antes de iniciar o serviço. A configuração de desenvolvimento usa o usuário root do MySQL; para outros ambientes, crie um usuário com permissões adequadas. O arquivo Compose não cria os bancos da aplicação automaticamente.

```bash
docker compose up -d mysql
docker compose ps
```

Aguarde o MySQL ficar saudável. Depois, execute os comandos npm da primeira seção. Se a porta 3306 estiver ocupada, escolha outra `DB_PORT` no `.env`; o Compose publica a porta configurada e a API utiliza o mesmo valor.

Para parar preservando o volume de dados:

```bash
docker compose stop mysql
```

Alterar `DB_PASSWORD` no `.env` não altera a senha de um servidor já inicializado no volume. Ajuste a credencial no MySQL antes de atualizar a configuração. Não remova volumes com dados que precisa manter.

## Relações

| Tabela | Relações e restrições |
| --- | --- |
| `users` | E-mail único; senha com hash bcrypt; timestamps |
| `categories` | Slug único; `use_in_menu` falso por padrão; timestamps |
| `products` | Slug único; estoque e flags com defaults; preços FLOAT; timestamps |
| `product_images` | FK para produto; caminho relativo de arquivo |
| `product_options` | FK para produto; shape/type limitados por ENUM; values CSV |
| `product_categories` | FKs para produto/categoria; chave composta para impedir vínculo duplicado |

Excluir um produto remove suas imagens, opções e vínculos por cascata no banco. A camada de serviço também cuida dos arquivos locais. Excluir categoria remove somente seus vínculos, preservando os produtos.

O banco de testes deve ter nome terminado em `_test` e ser diferente do banco principal. A suíte pode apagar seus dados; utilize somente registros descartáveis.
