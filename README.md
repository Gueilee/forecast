# Vendemmia Forecast

O **Vendemmia Forecast** é uma plataforma de planejamento orçamentário e forecast que compara o realizado de faturamento (notas fiscais importadas do Conexos/Oracle) com as metas planejadas de vendas (importadas via planilha Excel).

A stack do projeto é composta por:
1. **Frontend & Backend (Next.js Web App)**: Dashboard interativo com gráficos (Recharts) e tabelas (TanStack Table), utilizando controle de acesso por perfis (NextAuth.js).
2. **Banco de Dados (SQLite / Turso)**: Banco local em SQLite e produção no Turso (LibSQL) gerenciado através do Prisma ORM.
3. **Sync Daemon (Oracle Conexos → Turso)**: Robô executado em segundo plano para ler faturamento direto do Conexos Cloud (Oracle) e consolidar os dados semanalmente no banco de dados.

---

## 🚀 Como Rodar na Máquina Local

### Requisitos Prévios

- **Node.js** (versão 18 ou superior recomendada)
- **Docker & Docker Compose** (opcional, necessário para rodar o Sync Daemon em container)
- **Oracle Instant Client** (necessário no sistema local apenas se você for rodar os scripts de integração direta do Oracle localmente)

---

### Passo 1: Instalar Dependências

No diretório raiz do projeto, instale as dependências com o npm:

```bash
npm install
```

*Nota: Durante a instalação das dependências, o Prisma Client será gerado automaticamente (através do script `postinstall`).*

---

### Passo 2: Configurar Variáveis de Ambiente

Crie o arquivo `.env` a partir do modelo de exemplo:

```bash
cp .env.example .env
```

Abra o arquivo `.env` e configure conforme necessário. Para rodar **100% localmente**, a configuração mínima do SQLite e do NextAuth é suficiente:

```env
# Desenvolvimento local (SQLite)
DATABASE_URL="file:./prisma/dev.db"

# Autenticação
NEXTAUTH_SECRET="gere-um-secret-forte-equi" # Pode ser qualquer string longa aleatória
NEXTAUTH_URL="http://localhost:3000"

# Opcional: Configurações de Produção/Oracle (necessário apenas para rodar a sincronização Conexos)
TURSO_DATABASE_URL="libsql://seu-banco.turso.io"
TURSO_AUTH_TOKEN="seu-token"
CONEXOS_USER="CNXBI_VENDEMMIA"
CONEXOS_PASSWORD="sua-senha"
CONEXOS_HOST="host-conexos"
CONEXOS_PORT="porta"
CONEXOS_SERVICE="nome-servico"
```

---

### Passo 3: Criar o Banco de Dados Local (SQLite)

Execute as migrações do Prisma para criar as tabelas no arquivo de banco local (`prisma/dev.db`):

```bash
npx prisma migrate dev
```

---

### Passo 4: Importar Dados Iniciais (Planilha Excel)

A aplicação necessita da carga inicial de clientes e plano orçamentário para funcionar. Isso é feito a partir de uma planilha Excel (`forecast.xlsx`).

1. Abra o arquivo `scripts/import-excel.ts` e ajuste o caminho da planilha na constante `EXCEL_PATH` (linha 17-19) ou coloque a sua planilha no local correspondente.
2. Execute o comando de importação:

```bash
npm run import-excel
```

**O que este script faz?**
- Lê a aba `Base` do arquivo Excel configurado.
- Cria os registros de **Clientes** e do **Plano Orçamentário (Orçamento de 2026)**.
- Cria o usuário administrador padrão no banco de dados local:
  - **Email**: `admin@vendemmia.com.br`
  - **Senha**: `Vendemmia@2026`

---

### Passo 5: Rodar a Aplicação

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse o painel no navegador em: [http://localhost:3000](http://localhost:3000) e faça login com a credencial criada no Passo 4.

---

## 🛠️ Outros Scripts e Comandos Úteis

### Banco de Dados
* **Visualizar dados localmente (Prisma Studio)**: Abre uma interface web para visualizar/editar os dados do banco local.
  ```bash
  npm run db:studio
  ```
* **Migrar dados locais (SQLite) para o Turso (Produção)**:
  ```bash
  node scripts/migrate-to-turso.cjs
  ```

### Sincronização Conexos (Oracle)
* **Executar sync de notas fiscais manualmente (Mês Atual)**:
  ```bash
  node scripts/sync-nf.cjs
  ```
* **Executar sync de um período específico**:
  ```bash
  node scripts/sync-nf.cjs 2026      # Ano de 2026 inteiro
  node scripts/sync-nf.cjs 2026 5    # Maio de 2026
  ```

---

## 🐳 Executando com Docker

Se desejar rodar os serviços containerizados na máquina local ou em homologação:

1. **Subir a stack completa** (Next.js App + Sync Daemon):
   ```bash
   docker-compose up -d
   ```
2. O serviço de **Sync Daemon** (`forecast-sync`) rodará em segundo plano, executando a sincronização Conexos → Turso nos horários agendados pela variável `SYNC_HOURS` (padrão: 6h e 18h).
