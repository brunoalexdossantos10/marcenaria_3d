# Modelador 3D — fundação SaaS

## Fluxos implementados

- `/`: apresentação do software, CTA de cadastro e demonstração.
- `/login`, `/cadastro`, `/recuperar-senha`, `/nova-senha`: Supabase Auth com senha, sessão persistente e recuperação. O cadastro cria a organização após autenticação; contas que aguardam confirmação de e-mail concluem o onboarding ao entrar no painel.
- `/dashboard`: exige sessão e participação na organização. Visão geral, projetos, leads, catálogo, marca, integração, assinatura e configurações.
- `/m/:tenant`: configurador público completo, sem login, com marca e catálogo da organização.
- `/configurador`: demonstração original preservada.

O componente de página do configurador foi extraído, sem substituir Scene, builder, materiais, AR, ambientes, controles ou precificação. Os recursos 3D permanecem carregados no configurador; o painel não importa Scene, R3F ou texturas.

## Modelo de dados

A tabela `projects` existente foi ampliada com `organization_id`, mantendo os projetos pessoais (`organization_id is null`). `organization_members` relaciona usuários e organizações com OWNER, ADMIN, STAFF ou CUSTOMER. O catálogo extensível usa `catalog_items` com os tipos model/material/handle/accessory e referência aos IDs existentes. As configurações completas, incluindo múltiplos móveis e offsets de peças, continuam no JSON original.

Todas as tabelas públicas novas têm RLS. OWNER/ADMIN editam marca e catálogo; STAFF acessa projetos e leads. Clientes anônimos não leem projetos/leads e não fazem inserts diretamente nessas tabelas. `submit_tenant_quote` valida e insere projeto e lead em uma transação; o preço é a estimativa do configurador, não um pagamento ou compromisso comercial validado no servidor.

As funções SECURITY DEFINER são intencionais e limitadas: lookup interno de participação, onboarding autenticado, projeção pública de marca/catálogo e envio anônimo de orçamento. Usam `search_path` vazio, tabelas qualificadas e grants explícitos. Alertas dos advisors para estas funções não significam que o público pode consultar as tabelas privadas.

## Configuração operacional

Manter `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` nos ambientes do Vercel. Nenhuma chave service_role é enviada ao frontend.

No Supabase Auth, permitir as URLs reais de produção para `/dashboard` e `/nova-senha`; configurar também Site URL. A aplicação usa `location.origin` nos redirects. Google OAuth depende de habilitar o provider e configurar as credenciais no Supabase; o botão chama OAuth real e mostra erro se o provider estiver indisponível.

As migrations são aditivas. Testes SQL em `supabase/tests/tenant_isolation.sql` usam transação com rollback e não deixam contas ou organizações de teste. Executar com acesso administrativo somente em um ambiente de teste/controlado.

## Limites deste MVP

- Edição do catálogo usa os assets procedurais atuais: nome, descrição e disponibilidade. Não inclui upload de novos GLB ou novas texturas; `data` reserva a configuração futura.
- Logo por URL pública HTTPS; upload para Storage ainda não foi adicionado.
- Plano, assinatura e limites estão modelados; checkout e aplicação automática de limites ainda não estão ativos.
- Convites e administração de membros ainda não possuem interface; os papéis e isolamento já existem no banco.
- Link e código de botão estão disponíveis. Domínios próprios/iframe/SDK ficam para a próxima etapa.
- Rascunhos de visitantes são locais e separados por organização; pedidos de orçamento vão ao banco. Usuários OWNER/ADMIN/STAFF salvam diretamente na organização.
- Rotas administrativas são renderizadas no cliente após validação da sessão. A autorização dos dados é feita no PostgreSQL/RLS, não pela condição visual da interface.
