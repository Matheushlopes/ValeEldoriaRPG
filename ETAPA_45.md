# Etapa 45 — Pontos de atributos persistentes

- Distribuição de FOR/INT/DES/CON validada e salva atomicamente no SQLite via POST /api/characters/points.
- Cliente só altera os pontos após confirmação do servidor.
- Estado do personagem conectado sincronizado no mundo para cálculo de combate.
- Ao atualizar a página, /api/me restaura atributos e pontos persistidos.

**Render:** no plano gratuito, o SQLite local pode desaparecer em reinícios/deploys. Para persistência entre deploys, configure um banco durável.
