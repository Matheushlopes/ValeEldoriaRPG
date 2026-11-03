# Etapa 52 — Refinamento só com ouro e raridades melhores

- Removida a geração local de pedras de evolução por monstros.
- Removida a exigência de pedras no ferreiro; apenas ouro é consumido, inclusive na falha.
- Removidas referências a pedras do inventário e do simulador do catálogo.
- Raridades do servidor multiplayer, condicionais a ocorrer um drop (chance de item mantida em 45%):
  - Comum: 59%
  - Incomum: 23%
  - Raro: 11%
  - Muito raro: 5%
  - Épico: 1,7%
  - Lendário: 0,3%
- Pesos do modo local também ajustados para favorecer raridades elevadas.

**Limitação já existente:** refinamento e gasto de ouro no ferreiro ainda são locais ao navegador; no multiplayer é necessária uma API autoritativa para persistir refinamentos e débitos de ouro. Não há migração de dados antigos de pedras.
