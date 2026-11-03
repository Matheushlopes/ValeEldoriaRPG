# Etapa 53 — Guerreiro mais resistente

Alteração no combate multiplayer, em `server/app/services/monsters.py`:
- O Guerreiro passa a ganhar 1,05 de defesa por ponto de CON (antes 0,65).
- Após a defesa, recebe 25% menos dano físico dos monstros (mínimo de 1 de dano).
- Arqueiro e Mago mantêm os valores anteriores.
- Não modifica HP salvo, equipamentos, drops, XP ou ouro.
- Não modifica o cálculo de dano causado pelo Guerreiro.

Validada sintaxe Python. Teste de equilíbrio no Render ainda necessário.
