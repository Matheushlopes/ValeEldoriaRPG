# Etapa 43 — Ranking e combate visual multiplayer

- Ranking global por nível e XP, persistido no SQLite, acessível pelo botão 🏆 Ranking.
- Personagens remotos usam o sprite existente com movimento interpolado, identificação de classe, nome e nível.
- Ataques aceitos pelo servidor produzem eventos visuais para todos; arqueiros disparam flechas, magos bolas de fogo e guerreiros têm animação de golpe.
- O dano permanece calculado pelo servidor; os projéteis remotos são apenas visuais.

## Executar

`cd server && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`

Abra duas sessões em navegadores diferentes e ataque um monstro próximo.

**Limitação:** a mesma arte base é usada para as três classes; a distinção de classe é uma faixa colorida. Os projéteis visuais acompanham o evento de acerto aceito pelo servidor, não o instante inicial do disparo.
