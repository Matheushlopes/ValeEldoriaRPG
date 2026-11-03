# Etapa 51 — Otimização por zonas e reset do painel

## Mudanças
- População de monstros: 380 → 238 (~37% menos).
- Quantidades por zona: 27, 26, 26, 27, 30, 33, 36, 33.
- Multiplicadores de XP e ouro por zona: 1.11, 1.35, 1.54, 1.67, 1.82, 1.97, 2.08, 2.27.
- Apenas zonas com jogadores ativos recebem simulação de patrulha e combate no servidor.
- Mantida a sincronização próxima ao jogador, sem transmitir todos os monstros.
- Restaurados padrões do painel da Etapa 47 em `config/rules.js`.
- Alterada a chave de armazenamento do painel para `eldoria-rules-v51`, ignorando configurações antigas salvas no navegador.
- O botão Restaurar agora remove a chave antiga também.
- Preservadas correções posteriores de loot, atributos, efeitos e dano do arqueiro no servidor.

## Limitações
- O painel altera configurações locais do navegador; os cálculos do servidor são separados.
- Aumento de XP/ouro compensa parcialmente a redução de densidade, não garante XP/minuto idêntico.
- Render Free e SQLite não persistente podem causar perda de progresso após reinícios.
- Validada sintaxe Python e JavaScript, sem teste de carga real no Render.
