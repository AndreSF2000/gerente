# Mr Pizza — Horários da equipa

Aplicação web para o gerente do Mr Pizza montar o horário semanal da equipa. Sem
login: abre o site, escolhe a semana e clica nos turnos.

## Funcionalidades

- O site abre num painel **Resumo** com os turnos de hoje, a cobertura da
  semana, os avisos e atalhos para abrir cada dia no horário.
- Ecrã de abertura animado com a logo do Mr Pizza enquanto o horário carrega.
- Grelha semanal de segunda a domingo com dois turnos por dia.
- Horário próprio de fim de semana: sexta e sábado.
- Atribuição de turnos com um clique e remoção imediata.
- Total de horas por colaborador e comparação com o contrato semanal.
- Avisos automáticos de cobertura mínima da equipa (sem pizzaiolos) e dos
  pizzaiolos, excesso de contrato e turno duplo.
- Navegação entre semanas e botão para copiar o horário da semana anterior.
- No telemóvel, o horário fica focado num dia, com um seletor dos sete dias e
  um calendário mensal para planear o mês completo sem arrastar a tabela.
- No iPhone instalado, o zoom por pinça e o zoom automático ao tocar nos campos
  estão desativados, para o horário não desalinhar.
- Gestão da equipa: nome, função, horas de contrato e remoção. A função é
  escolhida numa lista, também no telemóvel, com opção para escrever outra.
- Turnos e mínimos de cobertura configuráveis. O mínimo da equipa não conta
  com os pizzaiolos, que têm um mínimo próprio em cada turno; a quantidade é
  escolhida numa lista.
- Exportação do horário como imagem no estilo do horário de atendimento do
  Mr Pizza, pronta para enviar no WhatsApp (semana, 4 semanas ou mês completo),
  com escolha entre todos, só pizzaiolos ou só colaboradores para
  enviar a grupos separados.
- Os pizzaiolos aparecem num grupo próprio, separados dos restantes
  colaboradores, tanto no horário como na imagem exportada. Basta a função
  conter “Pizzaiolo” (ou “Pizzaiola”).
- Cores da imagem exportada: dia e noite em azul-claro, sexta e sábado em azul
  mais escuro e folga em verde.
- Impressão/PDF e exportação/importação de backup em JSON.
- Gravação automática no Supabase.
- **Modo offline**: sem internet, o horário continua a funcionar e as alterações
  ficam guardadas no dispositivo (aparece **Guardado offline** no topo). Quando
  a ligação volta, são enviadas sozinhas para o Supabase, mesmo que feches e
  voltes a abrir a app entretanto.
- Instalável no iPhone como app no ecrã principal (Safari → Partilhar →
  Adicionar ao Ecrã Principal), sem barra do Safari e sem App Store.

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

## Instalar no iPhone (como app)

Não é preciso TestFlight, perfil de empresa nem publicar na App Store. O site
funciona como app instalada no ecrã principal:

1. Abre **https://gerente-eta.vercel.app** no **Safari** do iPhone. Tem de ser o
   Safari; o Chrome e o Firefox no iOS não instalam a app no ecrã principal.
2. Toca no botão **Partilhar** (o quadrado com a seta para cima).
3. Escolhe **Adicionar ao Ecrã Principal** (pode aparecer como “Adicionar ao
   ecrã principal” ou “Adicionar à Tela de Início”).
4. Dá o nome **Mr Pizza** e toca em **Adicionar**.

O ícone vermelho do Mr Pizza fica no ecrã principal e abre o horário em ecrã
inteiro, sem a barra de endereço do Safari. Como os dados estão no Supabase, a
app precisa de internet; não é uma versão offline. Quando o site é atualizado,
basta voltar a abrir a app para receber a versão nova.

A app está configurada para não permitir o zoom por pinça nem o zoom automático
ao tocar nos campos, mantendo o horário alinhado no telemóvel.

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
  manifest.ts          Manifesto da app instalada no iPhone
  globals.css          Estilos
  layout.tsx           Layout, fontes e metadados
  page.tsx             Página principal
components/
  ScheduleApp.tsx      Estado, gravação automática e abas
  OverviewView.tsx     Painel inicial com o resumo da equipa e da semana
  ScheduleView.tsx     Grelha semanal, totais e avisos
  TeamView.tsx         Gestão da equipa
  SettingsView.tsx     Turnos, cobertura (equipa sem pizzaiolos e pizzaiolos) e backup
  WhatsAppExport.tsx   Pré-visualização e partilha por WhatsApp (período e grupo)
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

## Versões

Cada publicação é marcada com uma tag Git (`v0.1.1`, `v0.1.2`, …) e a versão
aparece no rodapé do site. A numeração passou a usar três números para subir
mais devagar. A versão atual é **v0.1.2**.

- **v0.1.2** — modo offline: dá para continuar a preparar o horário sem
  internet; as alterações ficam no dispositivo e sobem sozinhas quando a
  ligação volta.
- **v0.1.1** — o grupo antes chamado “Outros colaboradores” passa a chamar-se
  apenas **Colaboradores** em todo o site e na imagem.
- **v0.1.0** — partilha separada por grupo: todos, só pizzaiolos ou só
  colaboradores, com imagem, legenda e ficheiro próprios.
- **v0.0.9** — ecrã de abertura animado com a logo do Mr Pizza enquanto o
  horário carrega.
- **v0.0.8** — escolha da função numa lista no telemóvel, igual ao computador,
  com opção de escrever uma função personalizada.
- **v0.0.7** — zoom por pinça e zoom automático dos campos desativados no
  iPhone, para o horário não desalinhar.
- **v0.0.6** — o botão de exportação do mês na partilha por WhatsApp passa a
  chamar-se apenas **Mês**.
- **v0.0.5** — o mínimo de cobertura da equipa passa a excluir os pizzaiolos;
  os dois mínimos são independentes.
- **v0.0.4** — opção de partilha do mês completo por WhatsApp, com a imagem e a
  legenda do mês inteiro.
- **v0.0.3** — painel Resumo ao abrir o site, com os turnos de hoje, a cobertura
  diária, os avisos e atalhos para cada dia da semana.
- **v0.0.2** — instalação no iPhone como app no ecrã principal, com ícone
  próprio e abertura em ecrã inteiro.
- **v0.0.1** — mínimo de pizzaiolos separado do resto da equipa em cada turno,
  escolhido numa lista, com avisos e linha de cobertura próprios.
- **v0.0.0** — versão inicial: tabela semanal, exportação para WhatsApp, grupos
  de pizzaiolos e modo móvel focado num dia, com calendário mensal.

As etiquetas antigas `v0.1` a `v0.8` continuam no histórico do GitHub. A partir
daqui a sequência é `v0.1.1`, `v0.1.2`, `v0.2.0`.

## Comandos

```bash
npm run dev     # desenvolvimento
npm run build   # build de produção
npm start       # servir o build
```
