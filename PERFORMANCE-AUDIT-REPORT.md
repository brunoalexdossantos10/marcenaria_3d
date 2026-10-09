# Auditoria de desempenho do configurador 3D

## Escopo

Auditoria e otimização focadas no configurador Three.js/React Three Fiber da `main`, preservando a geometria paramétrica, materiais, ambientes, AR/câmera, rotas, Supabase e a versão corrigida do TanStack Start.

## Linha de base observada

- A cena já utilizava `frameloop="demand"`, `dpr` limitado em dispositivos touch e `requestAnimationFrame` no componente de posicionamento.
- O móvel padrão gera **27 peças**, das quais **7 são interativas** (portas/gavetas) e **20 não são animáveis**.
- Antes da alteração, o `useFrame` dentro de `PartMesh` era registrado para todas as instâncias renderizadas. Assim, as 27 peças do móvel padrão tinham callback por frame, embora somente 7 precisassem de animação de abertura.
- Linha de base funcional: `npm run typecheck`, `npm run test` (**22/22**) e `npm run build` aprovados.
- O bundle de cena da linha de base foi gerado normalmente; não foi inventado um FPS de dispositivo real.

## Correções implementadas

### 1. Animação por frame somente onde é necessária

O loop de abertura foi extraído de `PartMesh` para `PartMotion`. Ele só é montado em portas, gavetas e portas basculantes/deslizantes.

Resultado estrutural no móvel padrão:

- callbacks `useFrame` de abertura: **27 → 7**;
- redução de callbacks de abertura não utilizados: **20 callbacks por frame eliminados**;
- `frameloop="demand"` e `invalidate()` foram preservados, portanto a cena parada não ganha um loop contínuo.

### 2. Memoização das peças

As peças passaram a usar `React.memo` com comparação dos dados geométricos, configuração, seleção, material e offsets. Mudanças de câmera, controles ou estado externo que não alteram uma peça não precisam reconstruir sua subárvore React.

### 3. Arraste limitado a um frame

Arraste de componentes modulares e acessórios agora acumula o último offset e publica no máximo uma atualização por `requestAnimationFrame`. O último valor ainda é descarregado imediatamente ao soltar/cancelar o ponteiro.

Isso reduz chamadas repetidas de normalização, `buildFurniture` e reconciliação React em dispositivos que enviam vários eventos de ponteiro entre frames.

## Validação após as alterações

- `npx prettier --write src/components/configurator/Scene.tsx` — aprovado
- `npm run typecheck` — aprovado
- `npm run test` — **22 testes aprovados**
- `npm run lint` — **0 erros**, 12 avisos preexistentes de Fast Refresh
- `npm run build` — aprovado, com os avisos já existentes de chunks grandes e configuração Vite/Nitro
- `git diff --check` — aprovado

## O que não foi afirmado

Não foi possível medir FPS, tempo de primeiro frame, draw calls ou memória em um celular físico a partir do sandbox. Essas métricas devem ser coletadas no Chrome DevTools/Performance ou em aparelhos desktop e móveis representativos após o deploy.

A otimização não altera indiscriminadamente geometrias, texturas, iluminação ou sombras; portanto, a qualidade visual e as dimensões físicas permanecem preservadas.
