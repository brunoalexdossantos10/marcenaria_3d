# Roteiro do configurador

## Fase 1 — configurador 3D

- [x] Material global atualiza estrutura, portas, interior e fundo; seleção por grupo permanece independente.
- [x] Puxadores, espelhos e acessórios têm geometria própria no cenário; peças montadas acompanham portas e gavetas.
- [x] Acessórios podem ser selecionados, deslocados no cenário e ajustados em centímetros no painel; a posição faz parte da configuração salva.
- [x] Pivôs de portas de abrir e basculantes, curso e corpo das gavetas revisados.
- [x] Piso, preenchimento de luz e reflexão do espelho revisados.
- [ ] Conferir visualmente combinações de modelos, materiais e ferragens em navegadores e aparelhos reais, incluindo WebXR quando disponível.

## Fase 2 — produto

| Recurso | Situação | Próxima entrega verificável |
| --- | --- | --- |
| Salvar projetos | Local e Supabase para usuário autenticado | Abrir e editar um projeto salvo; testar conta e recuperação. |
| Compartilhar projetos | Gera URL com configuração | Ler, validar e aplicar a configuração ao abrir a URL; preferir link curto para projetos persistidos. |
| Exportar JSON | Disponível | Importar e validar o JSON para edição posterior. |
| Exportar GLB e imagem | Pendente | Arquivos baixados correspondem ao modelo e à vista atual. |
| Leads e orçamento | Formulário e estimativa local | Persistir solicitação, status e consentimento; disponibilizar ao responsável. |
| WhatsApp | Pendente | Abrir conversa com número configurado e resumo/link do projeto. |
| Catálogo por marcenaria | Pendente | Mostrar somente itens e preços publicados pela marcenaria selecionada. |

## Fase 3 — SaaS multi-marcenaria

Cada marcenaria terá identidade própria (logo, cores e WhatsApp), catálogo, modelos e materiais. Um projeto e um lead pertencem a uma marcenaria; usuários só acessam dados dos seus vínculos. Definir entidades `marcenarias`, `membros`, `catalogo`, `modelos`, `materiais`, `projetos` e `leads`, políticas RLS por associação, painel de administração e publicação por domínio ou slug antes de ativar múltiplos clientes.

Os nomes, dados de contato, portfólio e preços ilustrativos atuais devem ser substituídos pelos dados aprovados da primeira marcenaria antes de captar leads reais.
