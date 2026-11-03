# Etapa 47 — combate multiplayer

- Monstros perseguem o jogador mais próximo dentro da mesma zona, com ataque e cooldown calculados pelo servidor.
- Dano, morte e reaparecimento do personagem são enviados ao jogador por WebSocket e salvos no SQLite.
- Movimentação de monstros é interpolada no navegador entre snapshots, reduzindo saltos visuais.
- Regeneração local de HP foi desativada no modo online para não sobrescrever o dano do servidor.

## Limitações
- Persistência em SQLite no Render gratuito continua sujeita a perda de dados após reinicialização/deploy.
- Balanceamento, poções e regeneração online ainda precisam ser migrados para o servidor.
- Alterações verificadas por compilação Python e verificação de sintaxe JavaScript; sem teste de carga real no Render.
