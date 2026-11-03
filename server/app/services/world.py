import asyncio
import math
import time
from fastapi import WebSocket
from app.core.settings import MAX_PLAYERS, WORLD_HEIGHT, WORLD_WIDTH
from app.services.characters import save_position
from app.services.monsters import MonsterService
from app.services import loot
from app.repositories.database import connection

MAX_SPEED = 190.0  # pixels/segundo, margem para bônus de movimento


class World:
    def __init__(self):
        self.players: dict[int, dict] = {}
        self.sockets: dict[int, WebSocket] = {}
        self.lock = asyncio.Lock()
        self.monsters = MonsterService()

    async def join(self, character: dict, socket: WebSocket):
        async with self.lock:
            if len(self.sockets) >= MAX_PLAYERS and character['id'] not in self.sockets:
                raise ValueError('Servidor cheio')
            previous = self.sockets.get(character['id'])
            if previous:
                await previous.close(code=4002)
            player = {k: character[k] for k in ('id','name','class_id','level','x','y','str','int','dex','con','xp','gold','points')}
            player.update(face='down', last_move=time.monotonic(), last_save=time.monotonic(),
                          hp=float(character['hp']), max_hp=round((75+character['con']*{'warrior':7.2,'archer':3.6,'mage':2.4}.get(character['class_id'],7.2))*(1.2 if character['class_id']=='warrior' else 1)))
            self.players[character['id']] = player
            self.sockets[character['id']] = socket
        await socket.send_json({'type': 'welcome', 'self': player['id'], 'players': self.snapshot(), 'monsters': self.monsters.nearby(player['x'],player['y']), 'inventory': loot.list_items(character['id'])})
        await self.broadcast(include_monsters=False)

    def snapshot(self):
        return [{k: p[k] for k in ('id','name','class_id','level','x','y','face')}
                for p in self.players.values()]

    async def move(self, character_id: int, message: dict):
        p = self.players.get(character_id)
        if not p:
            return
        try:
            x, y = float(message['x']), float(message['y'])
        except (KeyError, TypeError, ValueError):
            return
        if not math.isfinite(x) or not math.isfinite(y):
            return
        now = time.monotonic()
        elapsed = min(0.5, max(0, now - p['last_move']))
        max_distance = MAX_SPEED * elapsed + 5
        distance = math.hypot(x-p['x'], y-p['y'])
        if distance > max_distance and distance > 0:
            ratio = max_distance/distance
            x = p['x']+(x-p['x'])*ratio
            y = p['y']+(y-p['y'])*ratio
        p['x'] = min(WORLD_WIDTH-16, max(16, x))
        p['y'] = min(WORLD_HEIGHT-16, max(16, y))
        p['face'] = message.get('face') if message.get('face') in ('up','down','left','right') else p['face']
        p['last_move'] = now
        if now - p['last_save'] >= 5:
            save_position(character_id,p['x'],p['y'])
            p['last_save'] = now

    async def sync_attributes(self, character_id: int, attributes: dict):
        async with self.lock:
            player = self.players.get(character_id)
            if player:
                for key in ('str', 'int', 'dex', 'con', 'points'):
                    player[key] = attributes[key]
                player['max_hp'] = round((75+player['con']*{'warrior':7.2,'archer':3.6,'mage':2.4}.get(player['class_id'],7.2))*(1.2 if player['class_id']=='warrior' else 1))

    async def attack(self, character_id: int, message: dict):
        async with self.lock:
            player=self.players.get(character_id)
            if not player:
                return
            result=self.monsters.hit(player,message.get('mob_id'),message.get('magic') is True)
            if result:
                await self.send_event({'type':'player_attack','by':character_id,'class_id':player['class_id'], 'x':player['x'],'y':player['y'],'target_x':result['x'],'target_y':result['y']})
                await self.send_event(result)
                if result.get('kill'):
                    mob = self.monsters.mobs[result['mob_id']]
                    item, loot_status = loot.drop(character_id, mob.zone, mob.level)
                    socket=self.sockets.get(character_id)
                    if socket:
                        await socket.send_json({'type':'reward','xp':player['xp'], 'gold':player['gold'],
                                                'level':player['level'],'points':player['points'],
                                                'gained_xp':result['xp'],'gained_gold':result['gold'], 'item':item, 'loot_status':loot_status})

    async def send_event(self, payload):
        for socket in list(self.sockets.values()):
            try:
                await socket.send_json(payload)
            except Exception:
                pass

    async def leave(self, character_id: int, socket: WebSocket):
        if self.sockets.get(character_id) is not socket:
            return
        p = self.players.pop(character_id, None)
        self.sockets.pop(character_id, None)
        if p:
            save_position(character_id,p['x'],p['y'])
        await self.broadcast()

    async def broadcast(self, include_monsters=False):
        payload = {'type': 'players', 'players': self.snapshot()}
        stale = []
        for char_id, socket in list(self.sockets.items()):
            try:
                await socket.send_json({**payload, **({'monsters':self.monsters.nearby(self.players[char_id]['x'],self.players[char_id]['y'])} if include_monsters else {})})
            except Exception:
                stale.append((char_id,socket))
        for char_id, socket in stale:
            if self.sockets.get(char_id) is socket:
                self.sockets.pop(char_id,None)
                self.players.pop(char_id,None)

    async def run(self):
        elapsed = 0.0
        while True:
            await asyncio.sleep(.1)
            async with self.lock:
                self.monsters.tick(.1)
                events = self.monsters.combat_tick(self.players, .1)
                for event in events:
                    if event['type'] == 'player_hit':
                        with connection() as db:
                            db.execute('UPDATE characters SET hp=? WHERE id=?', (event['hp'],event['player_id']))
                    elif event['type'] == 'player_respawn':
                        with connection() as db:
                            db.execute('UPDATE characters SET hp=?,x=?,y=?,gold=? WHERE id=?',
                                       (event['hp'],event['x'],event['y'],event['gold'],event['player_id']))
            for event in events:
                socket = self.sockets.get(event['player_id'])
                if socket:
                    try:
                        await socket.send_json(event)
                    except Exception:
                        pass
            elapsed += .1
            if self.sockets and elapsed >= .2:
                await self.broadcast(include_monsters=True)
                elapsed = 0.0

world = World()
