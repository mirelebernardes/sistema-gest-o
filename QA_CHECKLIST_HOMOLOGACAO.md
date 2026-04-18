# Checklist de Homologacao Funcional

Data: 2026-04-12  
Objetivo: validar o sistema ponta a ponta apos o pacote de correcoes.

## 1) Status tecnico ja validado

- [x] API sobe e responde em `GET /api/health` (`status: ok`)
- [x] Validacoes de erro em endpoints publicos
  - [x] `GET /api/business/public/{id_invalido}` retorna 404
  - [x] `POST /api/leads/public/{id_invalido}` retorna 404
  - [x] `POST /api/leads/public/{id}` sem `name` retorna 400
- [x] Validacoes de autenticacao
  - [x] `POST /api/auth/login` sem credenciais retorna 400
  - [x] `POST /api/auth/login` com usuario invalido retorna 401
  - [x] `POST /api/register` com payload invalido retorna 400
- [x] Lint do projeto limpo (`npm run lint`)

Pendencia de ambiente:
- [ ] Build local (`npm run build`) ainda bloqueado por `spawn EPERM` (infra/permissao local)

---

## 2) Homologacao manual por fluxo

### 2.1 Login e sessao

1. Abrir `/login`.
2. Tentar login invalido e confirmar mensagem de erro.
3. Fazer login valido.
4. Recarregar pagina em uma rota interna (ex.: `/financeiro`) e confirmar que nao volta para dashboard.
5. Logout e confirmar retorno ao login.

Esperado:
- Mensagens de erro/sucesso coerentes.
- Persistencia de rota funcionando (`last_route`).

Status:
- [ ] Aprovado
- [ ] Pendente

---

### 2.2 Registro de negocio

1. Abrir `/register`.
2. Validar erros de formulario (nome curto, senha curta, confirmacao divergente).
3. Criar um negocio valido.
4. Confirmar tela de sucesso e navegacao para login.

Esperado:
- Validacoes consistentes.
- Cadastro concluido com nicho selecionado.

Status:
- [ ] Aprovado
- [ ] Pendente

---

### 2.3 Dashboard por perfil

Perfis:
- Admin
- Reception
- Professional

Passos:
1. Logar com cada perfil.
2. Verificar cards, atalhos e dados exibidos.
3. Confirmar que menu lateral respeita modulos habilitados.

Esperado:
- Menus e cards coerentes com papel/perfil.

Status:
- [ ] Aprovado
- [ ] Pendente

---

### 2.4 Leads (CRM/Kanban)

1. Criar lead manual.
2. Arrastar entre colunas.
3. Converter lead para cliente.
4. Testar automacoes de status (quoted/deposit_paid/scheduled/completed).
5. Validar links publicos de captacao.

Esperado:
- Mudanca de status persistida.
- Conversao lead->cliente funcional.
- Mensagens e feedbacks sem erro.

Status:
- [ ] Aprovado
- [ ] Pendente

---

### 2.5 Agenda

1. Criar agendamento.
2. Editar agendamento.
3. Testar validacao de conflito de horario (mesmo profissional/horario).
4. Confirmar card no dia correto.
5. Testar acao de WhatsApp no card.

Esperado:
- Criacao/edicao sem regressao.
- Bloqueio de conflito funcionando.

Status:
- [ ] Aprovado
- [ ] Pendente

---

### 2.6 Financeiro

1. Criar lancamento de entrada e saida.
2. Testar categoria de sinal/servico.
3. Confirmar calculos de comissao e lucro.
4. Testar filtros de periodo e busca.
5. Exportar CSV/PDF.
6. Testar fluxo de gerar link de pagamento.

Esperado:
- Calculos consistentes.
- Filtros e exportacoes funcionando.
- Sem status invalido (`fully_paid` nao deve aparecer).

Status:
- [ ] Aprovado
- [ ] Pendente

---

### 2.7 Configuracoes

1. Alterar dados gerais do negocio.
2. Alternar nicho e modulos.
3. Confirmar salvamento de modulos sem duplicacao por acento/espaco.
4. Validar horarios e notificacoes.
5. Testar tema claro/escuro/sistema.
6. Criar usuario e profissional.

Esperado:
- Salvamento consistente.
- Tema aplicado em telas principais.
- Modulos persistem corretamente.

Status:
- [ ] Aprovado
- [ ] Pendente

---

### 2.8 Portfolio publico

1. Abrir `/p/{publicId_valido}`.
2. Validar carregamento da vitrine.
3. Testar links para orcamento (`/budget/{publicId}`) e WhatsApp.
4. Abrir `publicId` invalido e validar fallback.

Esperado:
- Rota publica funcional sem hash.
- Fallback de erro adequado para ID invalido.

Status:
- [ ] Aprovado
- [ ] Pendente

---

### 2.9 DevPanel

1. Login no `/dev-panel`.
2. Health/status.
3. Listagem de negocios.
4. Query SQL de leitura.
5. Export de tenant.
6. Criacao de novo negocio.

Esperado:
- Sem erro de modelo legado (`studio/session/artist`).
- Contagens exibidas com `bookings`.

Status:
- [ ] Aprovado
- [ ] Pendente

---

## 3) Criterio de aceite final

- Todos os blocos acima marcados como `Aprovado`.
- Nenhum erro de runtime no console durante fluxos principais.
- Pendencia de build local (`EPERM`) tratada em ambiente de infraestrutura.

## 4) Registro de evidencias

Para cada bloco aprovado, anexar:
- data/hora
- perfil utilizado
- rota testada
- resultado
- print (quando aplicavel)

## 5) Evidencias executadas (automaticas)

Execucao: 2026-04-12

- Fluxo integrado autenticado: cadastro -> login -> negocio atual -> criar profissional -> criar cliente -> criar agendamento -> listar pagamentos.
- Resultado:
  - `register_ok: true`
  - `login_ok: true`
  - `professional_created: true`
  - `client_created: true`
  - `booking_created: true`
  - `payments_count: 1`
  - `has_deposit_payment: true`
  - `booking_conflict_status: 409` (bloqueio de conflito de horario validado)
  - `unauthorized_clients_status: 401` (endpoint privado protegido)
  - `business_type_saved: clinic` (persistencia de configuracao)
  - `business_hours_is_object: true` e `business_notifications_is_object: true` (parse consistente)
  - `public_lead_created: true` (captacao publica valida para `publicId` valido)
  - `generate_link_status: 400` sem credencial MP configurada (falha controlada)
  - Frontend em dev respondeu 200 para `/`, `/login`, `/register`, `/dashboard` e `/p/INVALID123`
  - Proxy Vite `GET /api/health` respondeu `ok`
  - Fluxo completo admin + profissional:
    - `auth_admin_login: true`
    - `auth_professional_login: true`
    - `rbac_users_for_professional_status: 403` (permissao correta)
    - `booking_completed_status: completed`
    - `payment_deposit_created: true`
    - `payment_final_created_on_complete: true`
    - `mp_generate_link_without_credentials_status: 400` (falha controlada)

Interpretacao:
- Fluxo de negocio principal no backend foi validado com sucesso para um tenant novo.
- Itens de UI continuam pendentes de validacao manual visual/interativa.

Observacao de ambiente (frontend):
- `npm run dev`, `npm run build` e `npm run start` falham com `spawn EPERM` no Vite/concurrently.
- Causa: bloqueio de execucao no ambiente local (infra/permissao), nao erro de regra de negocio/lint.
- Evidencia minima: teste direto em Node com `child_process.spawn('cmd', ...)` e `execFile('cmd', ...)` tambem retorna `EPERM`.

Atualizacao (setup novo computador):
- Node atualizado para `v20.20.2` e npm `10.8.2`.
- `prisma db:generate` e `prisma db:push` executados com sucesso fora do sandbox.
- Validacao final de runtime: `GET http://127.0.0.1:5173/` retornou `200` e `GET http://127.0.0.1:3001/api/health` retornou `ok` apos subir `npm run start`.
