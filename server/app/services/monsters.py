"""Mundo PvE autoritativo: spawns, HP, respawn e crédito de KS."""
import math
import random
import time
from dataclasses import dataclass
from app.repositories.database import connection
from app.core.settings import SPAWN_X, SPAWN_Y

TILE = 32
RANGES = [(1, 9), (10, 19), (20, 29), (30, 44), (45, 59), (60, 79), (80, 99), (100, 140)]
TYPES = [('slime','rat'), ('rat','wolf'), ('wolf','goblin'), ('goblin','orc'), ('skeleton','orc'), ('orc','king'), ('skeleton','king','orc'), ('king','orc','skeleton')]
# Menos monstros por zona; XP/ouro por abate compensam a densidade menor.
ZONE_COUNTS = (27, 26, 26, 27, 30, 33, 36, 33)
ZONE_REWARD_MULTIPLIERS = (1.11, 1.35, 1.54, 1.67, 1.82, 1.97, 2.08, 2.27)
CLASS = {
    'warrior': {'str': 1.65, 'dex': 0, 'mult': 1.08, 'delay': .9, 'speed': .6, 'dex_speed': .0045, 'range': 75},
    'archer': {'str': .85, 'dex': 1.15, 'mult': 1.12, 'delay': .75, 'speed': .88, 'dex_speed': .007, 'range': 265},
    'mage': {'str': .3, 'dex': 0, 'mult': .68, 'delay': .95, 'speed': .49, 'dex_speed': .0015, 'range': 190},
}

def zone_at(x, y):
    tx, ty = int(x // TILE), int(y // TILE)
    if tx < 1 or tx >= 79 or ty < 1 or ty >= 55 or abs(ty-28) <= 1 or any(abs(tx-r) <= 1 for r in (20,40,60)):
        return -1
    return (0 if ty < 28 else 4) + min(3, tx // 20)

def max_hp(level):
    return round(24 + 8*level + 1.65*level**1.7)

@dataclass
class Monster:
    id: int
    x: float
    y: float
    spawn_x: float
    spawn_y: float
    zone: int
    level: int
    type: str
    hp: int
    respawn_at: float = 0
    wander_x: float = 0
    wander_y: float = 0
    wander_until: float = 0
    aggro_until: float = 0

    def public(self):
        return dict(id=self.id, x=round(self.x,1), y=round(self.y,1), zone=self.zone,
                    level=self.level, type=self.type, hp=self.hp, defeated=self.hp<=0)

class MonsterService:
    def __init__(self):
        self.mobs = {}
        self.last_attack = {}
        self.mob_cooldowns = {}
        self.rng = random.Random(4321)
        for zone, (low, high) in enumerate(RANGES):
            col, row = zone % 4, zone // 4
            for _ in range(ZONE_COUNTS[zone]):
                x = self.rng.randint(col*20+3, (col+1)*20-3)*TILE+16
                y = self.rng.randint(3 if row==0 else 32, 24 if row==0 else 52)*TILE+16
                span=high-low+1
                band=self.rng.choices((0,1,2), weights=(60,30,10))[0]
                cuts=(0, max(1,math.ceil(span*.4)), max(2,math.ceil(span*.75)), span)
                a,b=cuts[band],cuts[band+1]
                level=low+self.rng.randrange(a,max(a+1,b))
                kind=self.rng.choice(TYPES[zone]); mid=len(self.mobs)
                self.mobs[mid]=Monster(mid,x,y,x,y,zone,level,kind,max_hp(level))

    def nearby(self, x, y, radius=760):
        r2=radius*radius
        return [m.public() for m in self.mobs.values() if (m.x-x)**2+(m.y-y)**2 <= r2]

    def tick(self, dt, active_zones=None):
        now=time.monotonic()
        for m in self.mobs.values():
            if active_zones is not None and m.zone not in active_zones:
                continue
            if m.hp <= 0:
                if now >= m.respawn_at:
                    m.hp=max_hp(m.level);m.x=m.spawn_x;m.y=m.spawn_y
                continue
            if now < m.aggro_until:
                continue
            if now >= m.wander_until:
                angle=self.rng.random()*math.tau
                m.wander_x=m.x+math.cos(angle)*self.rng.uniform(30,95)
                m.wander_y=m.y+math.sin(angle)*self.rng.uniform(30,95)
                m.wander_until=now+self.rng.uniform(2,5)
            dx,dy=m.wander_x-m.x,m.wander_y-m.y
            distance=math.hypot(dx,dy)
            if distance>3:
                step=min(distance,22*dt)
                nx=m.x+dx/distance*step;ny=m.y+dy/distance*step
                if zone_at(nx,ny)==m.zone:
                    m.x,m.y=nx,ny
                else:
                    m.wander_until=0

    def combat_tick(self, players, dt, active_zones=None):
        """Aggro e dano calculados exclusivamente no servidor; um alvo por monstro."""
        now = time.monotonic()
        events = []
        for m in self.mobs.values():
            if active_zones is not None and m.zone not in active_zones:
                continue
            if m.hp <= 0:
                continue
            candidates = [(math.hypot(m.x-p['x'], m.y-p['y']), p)
                          for p in players.values()
                          if p.get('hp', 0) > 0 and zone_at(p['x'], p['y']) == m.zone]
            if not candidates:
                continue
            distance, target = min(candidates, key=lambda item: item[0])
            if distance > 205:
                continue
            m.aggro_until = now + .4  # não misturar patrulha com perseguição
            if distance > 35:
                step = min(distance-35, (24+min(20,m.level*.5))*dt)
                nx = m.x+(target['x']-m.x)/distance*step
                ny = m.y+(target['y']-m.y)/distance*step
                if zone_at(nx,ny) == m.zone:
                    m.x,m.y=nx,ny
            # Recalcular após mover; a distância anterior podia gerar hits visuais incoerentes.
            distance = math.hypot(m.x-target["x"], m.y-target["y"])
            if distance > 43 or now < self.mob_cooldowns.get(m.id, 0):
                continue
            self.mob_cooldowns[m.id] = now + max(.85, 1.75-m.level*.013)
            is_warrior = target.get('class_id') == 'warrior'
            # Guerreiro: maior aproveitamento de CON e 25% de redução
            # no dano recebido após o cálculo de defesa.
            defense = 2 + target['con']*(1.05 if is_warrior else .65)
            attack = 5 + m.level*2 + .45*m.level**1.25
            raw_hit = max(1, round(attack-defense+self.rng.randint(-2,3)))
            hit = max(1, round(raw_hit*.75)) if is_warrior else raw_hit
            target['hp'] = max(0, target['hp']-hit)
            events.append({'type':'player_hit','player_id':target['id'],
                           'hit':hit,'hp':round(target['hp'],2), 'mob_id':m.id})
            if target['hp'] <= 0:
                loss = min(target['gold'], math.ceil(target['gold']*.1))
                target['gold'] -= loss
                target['hp'] = target['max_hp']
                target['x'],target['y'] = SPAWN_X, SPAWN_Y
                events.append({'type':'player_respawn','player_id':target['id'],
                               'hp':target['hp'],'x':target['x'],'y':target['y'],
                               'gold':target['gold'],'lost_gold':loss})
        return events

    def hit(self, player, monster_id, magic=False):
        """O cliente informa apenas o alvo. O servidor calcula dano e valida alcance/cooldown."""
        try: m=self.mobs[int(monster_id)]
        except (KeyError,ValueError,TypeError): return None
        if m.hp<=0 or zone_at(player['x'],player['y'])!=m.zone: return None
        cfg=CLASS.get(player['class_id'], CLASS['warrior'])
        if math.hypot(m.x-player['x'],m.y-player['y']) > cfg['range']+24: return None
        now=time.monotonic();pid=player['id']
        delay=cfg['delay']/max(.3,cfg['speed']*(1+player['dex']*cfg['dex_speed']))
        if now-self.last_attack.get(pid,0)<delay*.9: return None
        self.last_attack[pid]=now
        defense=1+.8*m.level+.16*m.level**1.2
        if player['class_id']=='mage':
            power=8+player['int']*2.3+7;defense*=.5
        else:
            power=(5+player['str']*cfg['str']+player['dex']*cfg['dex'])*cfg['mult']
        hit=max(1,round(power-defense+self.rng.randint(-2,3)))
        m.hp=max(0,m.hp-hit)
        result={'type':'mob_hit','mob_id':m.id,'hp':m.hp,'hit':hit,'by':pid,'x':m.x,'y':m.y}
        if m.hp==0:
            m.respawn_at=now+10
            xp=round((20+16*m.level**1.5)*.84*ZONE_REWARD_MULTIPLIERS[m.zone])
            gold=round((self.rng.randint(10,15)+m.level*3.2)*ZONE_REWARD_MULTIPLIERS[m.zone])
            result.update(kill=True, killer=pid, xp=xp, gold=gold)
            self.reward(player,xp,gold)
        return result

    @staticmethod
    def reward(player,xp,gold):
        player['xp']=player.get('xp',0)+xp
        player['gold']=player.get('gold',0)+gold
        while player['xp']>=round(105*player['level']**1.3):
            player['xp']-=round(105*player['level']**1.3)
            player['level']+=1
            player['points']=player.get('points',0)+5
        with connection() as db:
            db.execute('UPDATE characters SET xp=?,gold=?,level=?,points=? WHERE id=?',
                       (player['xp'],player['gold'],player['level'],player['points'],player['id']))
