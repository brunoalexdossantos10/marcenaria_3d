# Relatório de auditoria — Marcenaria 3D

**Data:** 2026-10-09  
**Repositório efetivamente acessado:** `brunoalexdossantos10/marcenaria_3d`  
**Branch de trabalho:** `audit/camera-sync-2026-10-09`  
**Branch de produção preservada:** `main`  
**HEAD remoto da branch:** `e1600ec0714f2f05abe24fb611a7f2aa7444f528`

## 1. Escopo e procedimento

A solicitação citava `marcenaria-configurador-3d-ar`, mas esse nome não estava acessível na conta conectada. O repositório autorizado e efetivamente selecionado foi `brunoalexdossantos10/marcenaria_3d`; a auditoria foi realizada nele, usando o ZIP mais recente versionado como fonte do código.

Antes da edição foram verificados:

- proprietário, branch padrão e permissão efetiva no GitHub;
- README, instruções locais, package scripts e testes;
- builder paramétrico, estado/persistência, seleção de catálogo, câmera, AR, USDZ, validação e migrações Supabase;
- histórico Git e árvore real do projeto.

O código-fonte foi materializado em um commit separado porque o repositório original continha principalmente os arquivos compactados. Nenhum ZIP original foi apagado.

## 2. Falhas confirmadas

### 2.1 Guarda-roupa aparecendo para todos os tipos

A causa raiz foi confirmada no `src/lib/furniture/builder.ts`: `buildFurniture()` usava a mesma carcaça de armário para todos os tipos. O campo `type` era usado para defaults, limites, categoria e acessórios, mas não selecionava uma geometria construtiva própria.

A auditoria reproduziu a saída estrutural:

- `mesa`: laterais, tampo, base, fundo, divisórias e gavetas;
- `rack`: carcaça genérica com fundo e módulos;
- `estante`: carcaça genérica com laterais, fundo e prateleiras;
- `painel-tv`: caixa rasa baseada na mesma carcaça.

Assim, a câmera não precisava “inventar” um guarda-roupa: ela recebia peças que já tinham sido construídas como armário.

### 2.2 Fontes duplicadas para câmera/AR/exportação

`CameraPreview`, `ARPreview` e `usdz.ts` recebiam simultaneamente `parts` e `config`. Isso permitia que uma lista de peças de uma renderização anterior ficasse desacoplada da configuração ativa. A cena compartilhada foi alterada para derivar as peças da configuração atual, eliminando esse caminho de estado obsoleto.

### 2.3 Retomada de projetos não carregava o projeto

O botão “Retomar” em `meus-projetos.tsx` apontava apenas para `/configurador`, sem transmitir `p.config`. Portanto, a tela podia reabrir a configuração padrão em vez do tipo, dimensões e componentes salvos.

### 2.4 Links de configuração não eram URL-safe

Os links de compartilhamento e de transferência para outro aparelho inseriam a carga base64 diretamente na query string. A correção aplica `encodeURIComponent()` e adiciona regressão para Unicode e caracteres reservados.

## 3. Correções implementadas

### 3.1 Builder paramétrico por família

`buildFurniture()` agora normaliza a configuração e despacha pela família declarada em `typeDef().baseType`:

- mesa e variantes de mesa: tampo, pernas, travessa, armazenamento sob o tampo, portas/gavetas opcionais, prateleiras, espelho, LED, acessórios e componentes modulares;
- painel de TV e variantes: painel principal raso, nichos frontais, prateleiras, módulo de armazenamento opcional, portas/gavetas, espelho, LED, suporte de TV, ripado, passagem de cabos e componentes;
- demais categorias: preservam o builder de gabinete existente, incluindo portas, gavetas, prateleiras, nichos, cabideiros, espelhos, acessórios e regras de posicionamento.

As variantes continuam usando seus defaults, limites e `baseType`; não foi criada uma câmera com geometria paralela ou fixa.

### 3.2 Fonte única para câmera, WebXR e USDZ

`createFurnitureScene(config)` agora chama `buildFurniture(config)` internamente. Câmera, WebXR e exportação USDZ usam essa mesma função e a mesma configuração ativa. O fluxo de limpeza de geometrias, materiais, renderer, listeners, sessões WebXR e URLs temporárias existentes foi preservado.

`CameraPreview` e `ARPreview` deixaram de receber `parts` como fonte de verdade; os efeitos são reexecutados quando a configuração muda e a cena anterior é desmontada.

### 3.3 Salvamento, compartilhamento e retomada

- “Retomar” agora abre `/configurador?c=...` com a configuração salva codificada;
- projetos grandes demais para o link não caem silenciosamente no móvel padrão: o usuário recebe uma mensagem para baixar o JSON;
- links de compartilhamento do configurador e do AR usam query string codificada;
- projetos, materiais, tipo e dimensões continuam passando pela normalização existente ao serem recuperados.

### 3.4 Executor de testes

O script anterior `node --test tests/*.test.*` não executava corretamente os testes TypeScript porque os imports locais sem extensão não eram resolvidos pelo strip de tipos nativo do Node. Foi adicionada somente a dependência de desenvolvimento `tsx` e o script passou a ser `tsx --test tests/*.test.*`. Nenhuma atualização indiscriminada de dependências foi realizada.

## 4. Testes criados e executados

Foram adicionadas regressões para:

- mesa e painel não reutilizarem a carcaça de guarda-roupa;
- cena da câmera reconstruir a identidade ativa;
- rack continuar sendo uma peça baixa;
- alteração de altura alterar a caixa da cena;
- portas, gavetas, prateleiras, espelho e componentes modulares continuarem editáveis nas famílias específicas;
- configuração URL-encoded ser recuperada exatamente.

A suíte existente também continuou cobrindo 104 presets, normalização, preços, materiais, posicionamento, links, armazenamento local, isolamento de projetos e servidor de orçamento.

Resultados executados após as alterações:

| Comando | Resultado |
|---|---|
| `npm ci` | Concluído; npm reportou 2 vulnerabilidades na árvore instalada (1 alta, 1 crítica) |
| `npm run typecheck` | Passou |
| `npm run test` | Passou: **22 testes, 22 aprovados, 0 falhas** |
| `npm run lint` | **0 erros**; 12 avisos preexistentes de `react-refresh/only-export-components` |
| `npm run build` | Passou para client, SSR/Nitro e Cloudflare preset |

O build ainda emite avisos não bloqueantes sobre o plugin `vite-tsconfig-paths`, chunks client maiores que 500 kB e `inlineDynamicImports` no Nitro.

## 5. Auditoria SaaS e segurança

As migrações Supabase foram revisadas sem alterações de schema nesta execução. Foram encontradas políticas RLS por usuário/organização, funções protegidas para onboarding e orçamento, validação server-side da configuração, limites de payload/rate limit e triggers de integridade para projetos/leads.

A validação automatizada existente também passou os testes de isolamento local e do endpoint de orçamento. Não foi executada uma prova contra uma instância Supabase de produção, pois não havia ambiente de dados conectado nesta execução; a validação de RLS em ambiente real continua recomendada antes do merge.

Nenhuma chave secreta, variável de ambiente, registro, projeto ou configuração existente foi apagado ou exposto.

## 6. Limitações e riscos remanescentes

- Não houve dispositivo físico Android com ARCore/WebXR nem iPhone/Safari com Quick Look disponível. Portanto, a escala em centímetros/metros, permissões reais de câmera, hit-test, sessão WebXR e abertura USDZ foram cobertos por código, build e testes de dados, mas não por smoke test físico.
- Não foi feito overhaul visual completo de PBR, sombras, HDR/environment ou oclusão de contato. As melhorias visuais desta execução são construtivas: mesa e painel deixaram de ser caixas de armário, e seus componentes agora são representados na mesma cena paramétrica.
- Rack e estante ainda compartilham o builder de gabinete de baixa altura, embora seus defaults e peças produzam uma identidade distinta; uma próxima etapa pode criar famílias construtivas dedicadas para cada uma das 104 variantes, sem alterar o contrato da cena.
- Os 12 avisos de Fast Refresh já estavam espalhados em componentes existentes e não bloqueiam o build, mas merecem limpeza futura.
- As 2 vulnerabilidades do `npm audit` não foram corrigidas automaticamente para evitar atualizar dependências sem análise de compatibilidade.
- Recomenda-se smoke test manual repetindo abertura/fechamento da câmera e troca de tipo no navegador alvo, além de validação RLS contra um projeto Supabase de staging.

## 7. Estado GitHub e publicação

Commits da branch:

1. `e4fbe7f chore: materialize configurator source for audit`
2. `064bbfd fix: sync category models and camera previews`
3. `692b285 test: cover rack identity and dimension updates`
4. `e1600ec docs: add camera sync audit report`

A branch `audit/camera-sync-2026-10-09` foi enviada ao GitHub e está sincronizada com o commit `e1600ec`. A `main` não foi alterada e não há pull request aberto. O código está pronto para revisão/PR, mas **não deve ser considerado pronto para publicação em produção** até executar os testes físicos e tratar os riscos explicitados acima.
