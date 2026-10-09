# Ateliê Nogal — configurador 3D e AR

Site de marcenaria com configurador de móveis, visualização 3D/AR e projetos salvos.

## Desenvolvimento

Requer Node.js 22 ou superior. Execute `npm ci` e `npm run dev`.

Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os valores públicos do projeto Supabase. A migração do banco está em `supabase/migrations`.

Visitantes podem salvar projetos neste navegador. Ao entrar por e-mail em **Meus projetos**, os novos projetos são salvos na conta, protegidos por RLS. Solicitações de orçamento são registros de projeto; o site ainda não envia mensagens à marcenaria.

## Publicação

Conecte este repositório ao Vercel, configure as duas variáveis acima para Production e Preview e ajuste a URL do site em **Supabase → Authentication → URL Configuration** para permitir o retorno do link por e-mail em `/meus-projetos`.
