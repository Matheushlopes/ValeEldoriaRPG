import asyncio
import math
import time
from fastapi import WebSocket
from app.core.settings import MAX_PLAYERS, WORLD_HEIGHT, WORLD_WIDTH
from app.services.characters import save_position
from app.services.monsters import MonsterService

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
            player.update(face='down', last_move=time.monotonic(), last_save=time.monotonic())
            self.players[character['id']] = player
            self.sockets[character['id']] = socket
        await socket.send_json({'type': 'welcome', 'self': player['id'], 'players': self.snapshot(), 'monsters': self.monsters.nearby(player['x'],player['y'])})
        await self.broadcast()

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
                    socket=self.sockets.get(character_id)
                    if socket:
                        await socket.send_json({'type':'reward','xp':player['xp'], 'gold':player['gold'],
                                                'level':player['level'],'points':player['points'],
                                                'gained_xp':result['xp'],'gained_gold':result['gold']})

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

    async def broadcast(self):
        payload = {'type': 'players', 'players': self.snapshot()}
        stale = []
        for char_id, socket in list(self.sockets.items()):
            try:
                await socket.send_json({**payload, 'monsters':self.monsters.nearby(self.players[char_id]['x'],self.players[char_id]['y'])})
            except Exception:
                stale.append((char_id,socket))
        for char_id, socket in stale:
            if self.sockets.get(char_id) is socket:
                self.sockets.pop(char_id,None)
                self.players.pop(char_id,None)

    async def run(self):
        while True:
            await asyncio.sleep(.1)
            self.monsters.tick(.1)
            if self.sockets:
                await self.broadcast()

world = World()
