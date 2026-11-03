"""Drops de equipamento decididos e persistidos pelo servidor."""
import json
import random
from pathlib import Path
from app.repositories.database import connection

CATALOG = json.loads(Path(__file__).with_name('loot_catalog.json').read_text(encoding='utf-8'))
RARITIES = [('common', 59), ('uncommon', 23), ('rare', 11), ('veryrare', 5), ('epic', 1.7), ('legendary', .3)]
MULT = {'common': 1, 'uncommon': 1.15, 'rare': 1.3, 'veryrare': 1.5, 'epic': 1.75, 'legendary': 2}
AFFIXES = {'gold':75,'xp':65,'drop':45,'crit':35,'critDamage':90,'lifesteal':18,'haste':45,'hp':60,'mana':55,'resist':35,'spell':65,'move':25,'hpRegen':150,'mpRegen':150,'cooldown':35,'aoe':60}
AFFIX_RANGES = {'common':(0,1,2,4),'uncommon':(1,1,3,6),'rare':(1,2,5,10),'veryrare':(2,2,7,13),'epic':(2,3,10,17),'legendary':(3,3,17,27)}

def list_items(character_id):
    with connection() as db:
        rows = db.execute('SELECT id,item_json FROM loot_items WHERE character_id=? ORDER BY id', (character_id,)).fetchall()
    return [dict(json.loads(row['item_json']), id=row['id']) for row in rows]

def drop(character_id, zone, level):
    # Chance base de 45% por monstro; apenas o jogador do golpe final recebe.
    if random.random() >= .45:
        return None, 'no_drop'
    candidates = [t for t in CATALOG if t['regionIndex'] == zone]
    if not candidates:
        return None, 'no_template'
    template = random.choice(candidates)
    rarity = random.choices([r for r,_ in RARITIES],weights=[w for _,w in RARITIES])[0]
    tier = template['tier']; stat = template['stat']
    raw = max(1,round(template['base']*MULT[rarity]*(1+tier*.1)))
    value = min(95,max(3,round(raw*.52))) if stat=='magic' else raw
    requirements = {'int':5+tier*2} if stat=='magic' else ({'str':5+tier*2,'dex':5+tier//2} if stat=='attack' else {'con':5+tier})
    low_count,high_count,low,high = AFFIX_RANGES[rarity]
    affixes = {key:min(AFFIXES[key],random.randint(low,high)+tier//2) for key in random.sample(list(AFFIXES),random.randint(low_count,high_count))}
    item = {**template,'refine':0,'requirements':requirements,'value':value,'rarity':rarity,'affixes':affixes,'origin':'drop'}
    with connection() as db:
        count = db.execute('SELECT COUNT(*) FROM loot_items WHERE character_id=?',(character_id,)).fetchone()[0]
        if count >= 30:
            return None, 'full'
        cursor = db.execute('INSERT INTO loot_items(character_id,item_json) VALUES (?,?)',(character_id,json.dumps(item,ensure_ascii=False)))
        item['id'] = cursor.lastrowid
    return item, 'ok'


def discard_item(character_id, item_id):
    with connection() as db:
        cursor = db.execute('DELETE FROM loot_items WHERE character_id=? AND id=?', (character_id, item_id))
        return cursor.rowcount == 1

def discard_all(character_id):
    with connection() as db:
        cursor = db.execute('DELETE FROM loot_items WHERE character_id=?', (character_id,))
        return cursor.rowcount
