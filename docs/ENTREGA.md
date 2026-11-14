# Entrega no GitHub

Prazo: **20/11/2026**. O formato solicitado é o link do repositório no GitHub. A equipe pode ter até três pessoas; informe todos os nomes no envio.

Participante informado: **Arlindo Barroso**.

Repositório de entrega: **https://github.com/Liucera/digital-store-backend**.

## Antes de enviar

1. Clone ou extraia o projeto em uma pasta limpa e siga o setup do README.
2. Configure o MySQL, aplique as migrations e execute `npm test` com o banco exclusivo de testes.
3. Abra `/docs` e confira cadastro, login, CRUD, buscas e erros.
4. Revise `git status`: `.env`, senhas, `node_modules/` e uploads recebidos não devem entrar no repositório.
5. Confira que `package-lock.json`, migrations, testes, `.env.example` e documentação estão versionados.
6. Confirme que o avaliador consegue acessar o link e que o README exibe os nomes corretos.

## Baixar e executar no VS Code

Baixe o [ZIP do projeto](https://github.com/Liucera/digital-store-backend/archive/refs/heads/main.zip) e extraia a pasta. O GitHub usa o nome `digital-store-backend-main`; renomeie a pasta extraída para **Digital Store Backend** e coloque-a em `E:\Geração Tech 4.0`. O arquivo `package.json` deve ficar diretamente em `E:\Geração Tech 4.0\Digital Store Backend`.

Abra essa pasta no VS Code e siga a configuração do README: `npm ci`, arquivo `.env`, chave JWT, MySQL, criação do banco, migrations e inicialização da API. A documentação interativa ficará em `http://127.0.0.1:3001/docs`.

## Atualizar o repositório

Para trabalhar com Git, clone o repositório em uma pasta vazia:

```bash
git clone https://github.com/Liucera/digital-store-backend.git
cd digital-store-backend
```

Depois de alterar e testar os arquivos:

```bash
git add .
git commit -m "Atualiza API da Digital Store"
git push
```

Se a pasta já tiver Git configurado, confira `git status` e `git remote -v` antes de publicar. Não adicione outro `origin` sem necessidade. O ZIP do GitHub não contém o histórico `.git`; utilize o clone para trabalhar com commits.

## Texto sugerido para o envio

```text
Projeto Back-end — Digital Store
Participante: Arlindo Barroso
Repositório: https://github.com/Liucera/digital-store-backend
```

Acrescente os outros integrantes quando houver. Publicação em hospedagem e pull request para o repositório oficial não são exigidos na apresentação desta atividade.
