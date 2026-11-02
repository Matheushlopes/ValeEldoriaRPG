# Vale de Eldoria Online — Etapa 41

## Iniciar o servidor

Requer Python 3.10+:

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Abra **http://localhost:8000**. Não abra `index.html` diretamente pelo sistema de arquivos: autenticação e multiplayer dependem do servidor. Outras pessoas na mesma rede podem acessar `http://IP_DO_SERVIDOR:8000`.

## Recursos online desta primeira versão

- Cadastro e login com hash PBKDF2 e sessão aleatória (token enviado por cabeçalho/primeira mensagem WebSocket).
- Personagem único por conta, nome único e escolha de Guerreiro, Arqueiro ou Mago.
- Banco SQLite persistente em `server/eldoria.sqlite3` (criado automaticamente).
- Jogadores conectados aparecem no mesmo mapa, com nome, classe e nível.
- Posições sincronizadas por WebSocket ~10 vezes/segundo e salvas periodicamente.
- Validação básica de velocidade, limites do mapa e credenciais no servidor.
- Separação entre API, serviços, repositório SQLite, segurança, mundo online e cliente de rede.

## Limitações IMPORTANTES (MVP multiplayer)

**Ainda não é um MMORPG com combate autoritativo.** Monstros, dano, XP, loot, inventário, compras e habilidades continuam simulados no navegador de cada jogador. Esses dados **não são sincronizados nem persistidos** no servidor; apenas a conta, personagem inicial e posição são persistidos. Ao reconectar, o equipamento inicial é recriado. O servidor não aceita atributos/XP enviados pelo navegador para evitar uma falsa persistência insegura. É necessário migrar essas regras para o backend antes de lançar um jogo competitivo.

Para publicar na internet: usar HTTPS/WSS com proxy reverso, proteção contra abuso, backup do banco, política de privacidade e infraestrutura de produção. Use apenas um processo Uvicorn nesta versão: o estado online reside na memória do processo.

## Organização

- `server/app/api/routes.py`: endpoints HTTP.
- `server/app/services/accounts.py`: autenticação.
- `server/app/services/characters.py`: personagens.
- `server/app/services/world.py`: conexões e posições multiplayer.
- `server/app/repositories/database.py`: SQLite.
- `server/app/core/security.py`: senhas e tokens.
- `client/online.js`: cliente de rede e tela de login.
- `game.js`, `combat.js`, `inventory.js`, `shop.js`, `smith.js`: lógica existente preservada e preparada para migração gradual ao servidor.
- `config/rules.js`: regras de balanceamento do protótipo; o painel ainda é local, não configura o servidor.


## Etapa 42 — Monstros compartilhados

Leia `README_MULTIPLAYER.md` para detalhes, comandos e limitações do combate autoritativo.
