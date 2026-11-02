# Etapa 44 — Correção de drops no multiplayer

- O servidor sorteia equipamento ao matar monstro (45% de chance base), seguindo KS.
- Itens são gerados a partir do catálogo regional e salvos em `loot_items` no SQLite.
- O evento `reward` inclui o item; o `welcome` recupera a bolsa persistida.
- A bolsa tem limite de 30 itens e não duplica drops por evento de morte.

## Limitações ainda existentes

**Atenção:** esta etapa persiste apenas os itens recebidos por drop. Operações posteriores no cliente (equipar, vender, descartar, refinar e comprar) ainda não atualizam o banco de dados; ao reconectar, itens de drop poderão reaparecer na bolsa. Não é adequado para produção. É necessário migrar todas essas ações para endpoints autoritativos e persistir o estado do equipamento. O Render gratuito não garante persistência do arquivo SQLite em reinicializações/deploys: use banco persistente antes de usar com jogadores reais.

## Teste

Crie duas contas, derrote monstros com ambas, confirme que o jogador do golpe final recebe XP, ouro e eventualmente itens, e reconecte para confirmar a recuperação da bolsa. A chance de 45% significa que nem toda morte gera equipamento.
