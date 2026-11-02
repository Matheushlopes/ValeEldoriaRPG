# Etapa 46 — Drops e otimização de rede

- Drops sorteados e gravados pelo servidor em `loot_items` (45% por monstro abatido).
- Ao reconectar, inventário é recuperado do SQLite.
- Descartar um item ou limpar a bolsa também remove os drops do banco.
- Atualizações completas de monstros reduzidas de 10/s para 2/s por jogador, diminuindo tráfego, serialização e reconstrução do estado no cliente.
- Movimentos enviados aproximadamente 6–7 vezes/s.
- Não confunda 45% de chance por morte com drop garantido.

## Limitações

- Equipar, vender, refinar e demais alterações de inventário ainda são locais e requerem sincronização posterior; não usar essas ações como teste de persistência.
- O Render gratuito usa armazenamento efêmero; para preservar contas/drops entre deploys, usar banco persistente.
- Testes de carga e de integração em ambiente Render ainda pendentes.
