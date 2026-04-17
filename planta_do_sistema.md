# 🏗️ Planta Fotográfica e Estrutural do Sistema
> Um guia definitivo para compreender a engenharia mecânica e arquitetônica do seu software.

---

## 1. APRESENTAÇÃO GERAL DA OBRA

**O que é este sistema?**
Trata-se de uma completa plataforma de gestão (CRM e ERP) especializada originalmente para estúdios de tatuagem, mas agora refatorada para ser **Multi-Nicho** (clínicas de estética, barbearias, etc).

**Qual problema ele resolve?**
Ele centraliza toda a gestão de um negócio físico: desde a captação de clientes (Leads) e agendamento, até o controle de profissionais, pagamentos, assinaturas de anamnese e estoque de materiais, tudo em um só lugar.

**Estágio Atual do Projeto:**
O projeto encontra-se em estágio de pré-produção/produção avançada, estável e operacional. A arquitetura foi refatorada recentemente para separar a lógica de negócio específica de um nicho (como "Tattoo") para termos mais genéricos ("Negócios e Profissionais").

---

## 2. FUNDAÇÃO DO SISTEMA

Como toda grande obra mecânica, o sistema é dividido na sua fundação:

- **Frontend (A Fachada e Ambientes):** Construído com **React.js** e **Vite**, é responsável por toda a parte visual. Ele opera como uma "Single Page Application" (SPA) — ou seja, uma obra contínua que apenas troca os painéis sem carregar novas páginas.
- **Backend (A Casa de Máquinas):** Feito em **Node.js** com **Express**. É a engrenagem oculta que processa regras de negócio, verifica quem é o morador, e coordena o envio e recebimento de cargas (dados).
- **Persistência (O Almoxarifado Central):** Utiliza **SQLite** (através do **Prisma ORM**). Aqui as pedras e materiais são devidamente estocados em caixas catalogadas, garantindo integridade das informações estruturais.
- **Autenticação (A Portaria):** Realizada via **JWT (JSON Web Tokens)**. Ao provar quem é na porta (Login), o porteiro fornece um "crachá" (Token) que deve ser mostrado cada vez que o usuário quiser acessar um cômodo ou pedir algo para a Casa de Máquinas.

---

## 3. ESTRUTURA PRINCIPAL DA CONSTRUÇÃO

A obra é subdividida em "Módulos", como as alas de um grande hotel:

1. **Autenticação (Login/Registro):** A recepção e setor de matrículas para novos negócios.
2. **Dashboard (Painel de Controle):** A sala central de análise, onde o dono do negócio enxerga a planta inteira de cima.
3. **Leads (Captação):** O hall de entrada. Onde visitantes e curiosos entram (pelo Instagram, WhatsApp, links) para consultar orçamentos.
4. **Clientes & Agenda:** O sistema de hospedagem e reservas. Controla quem é quem e marca os espaços na linha do tempo.
5. **Profissionais:** Os quartos da equipe. Gestão de cada prestador de serviço, suas comissões e sua agenda particular.
6. **Financeiro:** A tesouraria. Controla o dinheiro que entra, as saídas e efetua o "Split" automático (divisão do pagamento entre Profissional e Clínica/Estúdio).
7. **Estoque:** O depósito de suprimentos do hotel, com controle de baixas e alertas de níveis críticos.

---

## 4. PLANTA DOS CÔMODOS (TELAS E ROTAS)

Neste mapa, vemos como cada ambiente visual (**View**) foi arquitetado no Frontend:

| Cômodo (Tela / Componente) | Fechadura (Rota) | O que faz neste ambiente? | Quem tem as chaves? |
| :--- | :--- | :--- | :--- |
| **Login / Registro** | `/login` / `/register` | Ponto de partida. Geração de sessão ou portão de entrada para novos inquilinos. | Visitantes não Autenticados |
| **Dashboard** | `/dashboard` | Resumo de métricas, faturamento e agenda diária.  | Admins / Recepção / Profissionais |
| **Captação de Leads** | `/leads` | Gerenciamento Kanban (arrastar e soltar) de interessados em serviços. | Admins / Recepção |
| **Clientes** | `/clientes` | Cadastro completo (Fichas de Anamnese, Documentos, Histórico). | Admins / Recepção |
| **Agenda** | `/agenda` | A grande prancheta de horários de todo o time de serviços. | Todos |
| **Profissionais** | `/profissionais` | Cadastro de funcionários/artistas e suas devidas comissões. | Admins (Apenas Adição) |
| **Portfólio** | `/portfolio` | Quadro de exibição dos trabalhos de todos da equipe.+ URL pública. | Todos |
| **Financeiro** | `/financeiro` | Livro caixa e tesouraria. Controla pagamentos e gera links/cobranças. | Admins |
| **Estoque** | `/estoque` | Galpão registrando agulhas, tintas, anestésicos, etc. | Admins / Recepção |
| **Configurações** | `/configuracoes` | Painel elétrico do estabelecimento: personaliza dados do negócio e equipe de recepção. | Admins |

---

## 5. INSTALAÇÕES INTERNAS (TUBULAÇÕES DO FRONTEND)

O interior das paredes conta com dutos essenciais para que toda a magia aconteça:

- **BusinessContext:** É o "Coração Central de Transmissão" (State Management). Assim que o usuário entra, esse duto suga as informações globais (como sua agenda, clientes e negócios) usando o `fetchAll` e envia pelas paredes para todas as telas, evitando viagens excessivas até a Casa de Máquinas (Backend).
- **ThemeContext:** Controla as lâmpadas do prédio. Através da Chave `app_theme_mode` salva no rolo de memórias (localStorage), impõe as cores e tons de fundo em Claro ou Escuro.
- **Dicionário Multi-Nicho `terminology.js`:** A secretária bilíngue. Ela detecta se o andar atende a tatuadores ou estética e troca instantaneamente placas da obra de "Tatuadores" para "Profissionais", e de "Sessões" para "Agendamentos".
- **Local Storage:** Onde o usuário guarda a chave do prédio (JWT `app_token`) e a placa do último cômodo visitado (`last_route`), assim se a energia acabar (F5 no Chrome) ele retorna direto pro mesmo lugar. 

---

## 6. ENCANAMENTO E FIAÇÃO (FLUXO DOS DADOS)

As entidades desenhadas pelo **Prisma ORM** são altamente relacionadas. 

- O eixo central é o **Business (Negócio)**. Ele é o prédio inteiro. Nada existe fora de um Business.
- O Business agrupa **Usuários** (Recepções/Admins) e **Profissionais** (quem põe a mão na massa).
- Os **Clientes** estão atrelados ao Business, podendo assinar **Anamneses** e possuir **Documentos**.
- Quando um cliente e um profissional se encontram, gera-se o **Booking (Agendamento)**.
- Quando esse agendamento é convertido em prestação, gera-se o encanamento dos **Payments (Pagamentos)** contendo uma divisão de valor monetário (a comissão).

*A Fiação Frontend <=> Backend:*
Toda vez que a aba `/clientes` é aberta, o Frontend usa o `api.js` contendo o *Token JWT*, bate na porta `/api/clients`, o Porteiro (`auth.js` middleware) varre o crachá, permite o fluxo, o Controller do banco resgata da laje local os dados e retorna em JSON. O BusinessContext espalha pelos componentes.

---

## 7. ÁREA TÉCNICA DA OBRA (O NODE.JS E AS CATRACAS)

Visão profunda do `server/src`:

1. **`index.js`:** Pátio Central de Distribuição. Define que todas as conexões vão exigir o JSON parser. E conecta cada túnel `/api/pasta` com seu sub-roteador.
2. **`middleware/auth.js` (A Catraca):** O filtro absoluto. Se o JWT estiver vencido ou inválido, ele baixa a cancela (`401 Unauthorized`). Conta também com checagem se o banco do Negócio ainda está Ativo (caso contrário: `403 Negócio desativado`).
3. **Serviços / Rotas:**
   - **`auth.js`**: Fabrica os crachás.
   - **`studios.js`**: Controlador máximo do "Business", lidando com os dados do edifício.
   - **`sessions.js`**: As Reservas em si.
4. **Prisma ORM (`schema_prod.prisma`)**: O arquiteto engenheiro (SQLite) ditando que o `Business` apaga em "Cascata" todas restrições de tabelas de Clientes e Pagamentos que tiver em seu nome (um prédio sendo demolido afunda tudo junto).

---

## 8. CIRCULAÇÃO DENTRO DA CONSTRUÇÃO (FLUXOS)

Como a energia cinética flui no sistema diariamente?

1. **O Caminho do Login:** O Usuário digita login/senha -> O Backend confere no Prisma (`bcrypt` e JWT) -> Envia Token+UserAuth -> Frontend salva Token no Storage -> O contexto da obra entra em ignição (fetchAll puxando tudo) -> App redireciona ao `/dashboard`.
2. **O Caminho da Venda Completa:**
   - Lead manda WhatsApp -> Cai na rota `/leads` Kanban.
   - Lead aceita o orçamento -> O Lead é convertido -> Sistema fabrica um registro em `/clientes`.
   - Agenda-se a data em `/agenda`.
   - No dia, o Lead assina os termos (`anamnesis`).
   - O serviço encerra -> Clique em Pagar -> Rota `/financeiro` -> O Split define % Comissão -> Saldo na área das métricas é atualizado e o profissional notificado.

---

## 9. PONTOS DE MANUTENÇÃO E REFORÇO ESTRUTURAL

> [!NOTE]
> Durante a transição para plataformas Multi-Nicho, várias vigas precisaram ser remendadas.

1. **Compatibilidades Legadas (Aliases):** Foi criado espelhos nas rotas do backend (ex: `app.use('/api/studios', businessRoutes)` e `app.use('/api/artists', professionalRoutes)`) para que requisições antigas não despencassem ao renomear pastas e tabelas internas da base.
2. **Estabilização do Dashboard Web:** Correções foram aplicadas onde a tela "DashboardFinanceiro" quebrava por falta de cálculos adequados para métricas pendentes.
3. **Persistência ao Recarregar:** A fiação `localStorage.getItem('app_user')` corrigiu o bug dos estilhaços cegos; agora ao dar F5, o Context segura a autenticação impedindo que o estado visual retorne falsamente à tela de login.

---

## 10. PARTES ANTIGAS MANTIDAS NA ESTRUTURA

Como em construções retro-fitadas:
- **`artists.js` / `/tatuadores`:** Você ainda verá chamadas na API para artistas e sessões (`sessions`). Não tente apagar o `sessions.js` achando ser redundante, eles são os trilhos originais e várias partes do app legado ainda consultam por lá.
- **BusinessContext.db:** Uma casca forjada para manter certas propriedades que os componentes mais antigos buscavam de forma síncrona.
- Os modelos `Booking` ainda guardam a string livre de `project` por causa de antigas tatuagens referenciadas como projetos.

---

## 11. EXPANSÕES FUTURAS DA OBRAS (O QUE FAZER DEPOIS?)

- **Escalabilidade (Banco em Postgres):** O SQLite local dentro do seu pátio logo pode atingir gargalos caso a rede de multi-nichos abrigue centenas de negócios.
- **Relatórios Complexos PDF:** A infraestrutura já possui tabelas limpas para acoplar uma biblioteca geradora de balanços profundos.
- **Testes Automatizados (Vistoria Robótica):** A necessidade de `Jest/Cypress` nas áreas Kanban e Split Financeiro é crítica para que nenhum refatoramento futuro quebre a calculadora de dinheiro (pagamentos pendentes e comissões). 
- **Refinação de Webhooks de Pagamento:** Integrar de forma profunda Mercadopago aos webhooks `server/src/routes/webhooks.js`.

---

## 12. GLOSSÁRIO DE OBRA + SOFTWARE

- **Frontend:** O cimento estético. O que a pessoa vê na tela e clica.
- **Backend:** O quadro elétrico fechado. As contas lógicas dos números, banco de dados e validações.
- **Rota (Endpoint):** Um endereço final dentro de um cabo; Ex: "Para as informações dos funcionários vá no guichê /api/professionals".
- **Contexto (Context API):** A torre da caixa d'água superior do frontend que abastece informação simultaneamente pros banheiros e torneiras sem o usuário ter que buscar na rua (backend) de novo.
- **Middleware:** A cancela de guarita do prédio. Verifica as regras de acesso antes que você chegue nos escritórios.
- **JWT (JSON Web Token):** O "passaporte/carteirinha" inviolável assinado que comprova sua identidade dentro do prédio por algumas horas.
- **Refatoração:** Rasgar tetos antigos e refazê-los melhores sem destruir a estrutura que eles seguram.
- **Legado:** Ferramentas, vigas, ou paredes construídas na primeira versão e que não valem a pena arrancar no momento pois tudo pode acabar caindo junto.

---

## 13. ENTREGA FINAL EM COMPACTO

### A. Resumo Executivo
Temos um ERP de Gestão SPA (React/Node.js) completamente operacional, focado originalmente em Estúdios de Tatuagem porém convertido a Multi-Nicho num processo de regressão de nomenclaturas (Tattooers virando Profissionais). A arquitetura apoia-se em um State Contextual pesado e uma autenticação unificada JWT no Node. A fundação de pagamentos e fluxos é sólida devido às tabelas unificadas no Prisma usando o "BusinessId".

### B. Planta Textual
```text
📦 ROOT (PLATAFORMA MULTI-NICHO)
 ┣ 📂 frontend (React + Vite)
 ┃ ┣ 📂 src
 ┃ ┃ ┣ 📂 components (Partes modulares: ThemeSelectors, Wrappers, Menus)
 ┃ ┃ ┣ 📂 context (O cérebro: BusinessContext, ThemeContext)
 ┃ ┃ ┣ 📂 views (As salas em si: Dashboard, Financeiro, Agenda)
 ┃ ┃ ┗ 📜 App.jsx (A Rota Mestra e o Esqueleto Visual / Sidebar)
 ┃ ┗ 📜 index.html (A Porta de Lona)
 ┗ 📂 server (Casa de Máquinas do Node)
   ┣ 📂 prisma (Contrato Universal DB SQLite)
   ┣ 📂 src
   ┃ ┣ 📂 middlewares (Catracas: auth.js, etc)
   ┃ ┣ 📂 routes (Fios: clients.js, bookings.js)
   ┃ ┗ 📜 index.js (O Switch Central 0.0.0.0:3001)
```

### C. Fluxograma de Operação (O Ciclo da Venda Perfeita)
> Visitante -> `Captação`/`Leads` → **Aceite Comercial** → Gera conta de `Cliente` → Seleciona horário na `Agenda` (+ `Anamnese`) → Presta-se o `Serviço` com um `Profissional` → Finalização via Módulo `Financeiro` → *Dinheiro dividido (Split/Ganhos e Lucro do Dia somado no Painel).*
