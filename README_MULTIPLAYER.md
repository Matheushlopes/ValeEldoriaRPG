# Etapa 42 — Monstros compartilhados e KS

## Executar

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Abra `http://localhost:8000` em dois navegadores com contas diferentes.

## Como funciona

- `server/app/services/monsters.py`: cria a população de monstros uma vez por processo, controla a movimentação aleatória, HP, dano, morte e respawn.
- `server/app/services/world.py`: recebe ataques e distribui eventos `mob_hit` para todos os clientes. Também envia snapshots de monstros próximos a cada 100 ms.
- `client/online.js`: sincroniza as entidades compartilhadas e aplica eventos de dano na interface.
- O cliente manda apenas o ID do alvo. O servidor valida alcance, zona e intervalo entre ataques e calcula o dano com base na classe e atributos do personagem.
- **KS (kill steal)**: quem aplicar o golpe final recebe o XP e o ouro da morte, mesmo que outro jogador tenha causado a maior parte do dano. XP, ouro, nível e pontos são salvos no SQLite.

## Limitações importantes da etapa

Este é um **primeiro PvE compartilhado**, ainda não um MMORPG pronto. O servidor ainda precisa assumir a responsabilidade por habilidades em área, drops, equipamentos, inventário, lojas, atributos distribuídos, dano dos monstros nos jogadores e validação completa da movimentação. Habilidades podem produzir efeitos visuais no cliente, mas o servidor trata os golpes recebidos como ataques básicos com intervalo de recarga; os bônus e efeitos especiais das habilidades ainda não são autoritativos. Não exponha o serviço publicamente como jogo competitivo antes dessas migrações.

O mundo em memória pressupõe **um processo Uvicorn**. Não execute com `--workers` maior que 1, pois cada processo teria seu próprio conjunto de monstros.
