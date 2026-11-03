# Etapa 48 — Movimento fluido e alcance de ataque

- Snapshots de monstros a cada 200 ms (5 Hz), com interpolação temporal suave independente do FPS.
- Corrigido conflito entre patrulha e perseguição no servidor.
- Distância de ataque recalculada após a movimentação do monstro.
- Atualização de posição do jogador a cada 100 ms.

**Limites:** interpolação visual ainda introduz pequeno atraso entre servidor e tela. Para sincronismo mais rigoroso, evoluir para snapshots com timestamp, buffer de interpolação e compensação de latência. O Render gratuito também pode apresentar latência e lentidão.
