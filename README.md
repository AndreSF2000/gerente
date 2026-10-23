# Mr Pizza — Horários da equipa

Aplicação web para o gerente do Mr Pizza montar o horário semanal da equipa. Sem
login: abre o site, escolhe a semana e clica nos turnos.

## Funcionalidades

- Grelha semanal de segunda a domingo com dois turnos por dia.
- Horário próprio de fim de semana: sexta e sábado.
- Atribuição de turnos com um clique e remoção imediata.
- Total de horas por colaborador e comparação com o contrato semanal.
- Avisos automáticos de cobertura mínima, excesso de contrato e turno duplo.
- Navegação entre semanas e botão para copiar o horário da semana anterior.
- Gestão da equipa: nome, função, horas de contrato e remoção.
- Turnos e mínimos de cobertura configuráveis.
- Exportação do horário como imagem no estilo do horário de atendimento do
  Mr Pizza, pronta para enviar no WhatsApp (semana ou 4 semanas).
- Os pizzaiolos aparecem num grupo próprio, separados dos restantes
  colaboradores, tanto no horário como na imagem exportada. Basta a função
  conter “Pizzaiolo” (ou “Pizzaiola”).
- Cores da imagem exportada: dia e noite em azul-claro, sexta e sábado em azul
  mais escuro e folga em verde.
- Impressão/PDF e exportação/importação de backup em JSON.
- Gravação automática no Supabase.

## Correr localmente

Requer Node.js 20.9 ou superior.

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Sem Supabase configurado, o ambiente de desenvolvimento guarda os dados em
`.data/schedule.json` (fora do Git). Em produção sem base de dados, o site
funciona em modo local e guarda os dados apenas no navegador do dispositivo.

## Configurar o Supabase (uma vez)

1. Cria uma conta gratuita em [supabase.com](https://supabase.com) e um novo
   projeto. Guarda a password da base de dados que ele pedir.
2. No painel do projeto, abre **SQL Editor → New query**, cola o SQL abaixo e
   clica **Run**. Também está em [supabase/schema.sql](supabase/schema.sql).

```sql
create table if not exists public.mr_pizza_schedule (
  id integer primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.mr_pizza_schedule enable row level security;

revoke all on table public.mr_pizza_schedule from anon, authenticated;
grant all on table public.mr_pizza_schedule to service_role;
```

3. Abre **Settings → API Keys** e cria uma **secret key** (nome à escolha, por
   exemplo `site-mr-pizza`). Copia o valor, que começa por `sb_secret_...`.
   Só aparece uma vez. Não uses a publishable/anon key: o site não precisa dela.
4. Copia também o **Project URL**, que aparece no botão **Connect** ou em
   **Settings → Data API**, no formato `https://xxxxxxxx.supabase.co`.

### Onde colocar as chaves

**No teu computador:** cria um ficheiro `.env.local` na raiz do projeto (já está
fora do Git):

```bash
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

Reinicia o `npm run dev` depois de criar o ficheiro.

**Na Vercel:** abre o projeto → **Settings → Environment Variables** e adiciona
as duas variáveis com os mesmos nomes (`SUPABASE_URL` e
`SUPABASE_SECRET_KEY`) para **Production** (e **Preview**, se quiseres). Depois
faz **Redeploy**, porque as variáveis só entram num deploy novo.

A secret key só é lida no servidor ([lib/storage.ts](lib/storage.ts)); nunca é
enviada para o browser. Se for exposta, apaga-a em **Settings → API Keys** e cria
outra.

## Publicar na Vercel

1. Cria um repositório Git com este projeto e envia-o para o GitHub/GitLab/Bitbucket.
2. Na Vercel, escolhe **Add New → Project** e importa o repositório. As
   configurações de build são detetadas automaticamente (`next build`).
3. Adiciona as variáveis de ambiente do Supabase (ver acima).
4. Faz deploy.
5. Abre o site e confirma em **Definições → Dados e backup** que aparece
   **Base de dados Supabase**.
6. Opcional: adiciona um domínio próprio em **Settings → Domains**.

> Sem as variáveis do Supabase, a Vercel não tem onde guardar os dados de forma
> permanente. O site abre e funciona, mas cada navegador fica com os seus
> próprios dados e o aviso “Base de dados ainda não ligada” aparece no topo.

### Variáveis de ambiente

| Nome                  | Obrigatória                        | Descrição                                              |
| --------------------- | ---------------------------------- | ------------------------------------------------------ |
| `SUPABASE_URL`        | Para sincronizar entre dispositivos | Project URL do Supabase.                               |
| `SUPABASE_SECRET_KEY` | Para sincronizar entre dispositivos | Secret key (`sb_secret_...`), só para uso no servidor. |

Também é aceite o nome antigo `SUPABASE_SERVICE_ROLE_KEY`, para projetos que
ainda usam a chave `service_role` legada.

## Dados, backup e segurança

- Todos os dados são guardados numa única linha JSON na tabela
  `mr_pizza_schedule`. Não é preciso configurar esquema nem migrações: o SQL
  acima cria a tabela.
- A tabela tem RLS ativo e não tem políticas. O acesso é retirado aos papéis
  `anon` e `authenticated`, por isso a publishable key não consegue ler nem
  escrever nada. Só a secret key do servidor (`service_role`) tem acesso.
- Isto protege a base de dados, mas não o site: a aplicação não tem login e quem
  tiver o endereço consegue ver e alterar o horário. Não partilhes o link
  publicamente.
- Se duas pessoas editarem ao mesmo tempo, ganha a última gravação.
- Em **Definições → Dados e backup** podes exportar um JSON com equipa, turnos e
  configurações. Esse ficheiro serve de cópia de segurança ou para importar
  noutro dispositivo.
- Se começaste a usar o site sem base de dados e ligaste o Supabase depois, o
  site oferece importar os dados que ficaram guardados nesse navegador (apenas
  quando o horário online ainda está vazio).

## Estrutura

```
app/
  api/state/route.ts   API de leitura e gravação (Supabase ou ficheiro local)
  globals.css          Estilos
  layout.tsx           Layout, fontes e metadados
  page.tsx             Página principal
components/
  ScheduleApp.tsx      Estado, gravação automática e abas
  ScheduleView.tsx     Grelha semanal, totais e avisos
  TeamView.tsx         Gestão da equipa
  SettingsView.tsx     Turnos, cobertura mínima e backup
  WhatsAppExport.tsx   Pré-visualização e partilha do horário por WhatsApp
lib/
  dates.ts             Datas e formatação em português
  export-image.ts      Desenho da imagem do horário para WhatsApp
  schedule.ts          Cálculo de horas, cobertura e avisos
  sanitize.ts          Validação dos dados
  team-groups.ts       Separação entre pizzaiolos e restantes colaboradores
  storage.ts           Supabase e ficheiro local de desenvolvimento
supabase/
  schema.sql           SQL para criar a tabela no Supabase
```

## Comandos

```bash
npm run dev     # desenvolvimento
npm run build   # build de produção
npm start       # servir o build
```
