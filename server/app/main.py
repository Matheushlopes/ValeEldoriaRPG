import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from app.api.routes import router
from app.core.settings import ROOT
from app.repositories.database import initialize
from app.services.accounts import authenticated_user
from app.services.characters import get_character
from app.services.world import world

@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize()
    task = asyncio.create_task(world.run())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

app = FastAPI(title='Vale de Eldoria Online', lifespan=lifespan)
app.include_router(router)

@app.websocket('/ws')
async def websocket_game(socket: WebSocket):
    # O navegador envia o token como primeira mensagem; não expor tokens em URL/logs.
    await socket.accept()
    char_id = None
    try:
        auth = await asyncio.wait_for(socket.receive_json(), timeout=8)
        if auth.get('type') != 'auth':
            await socket.close(code=4001)
            return
        try:
            user = authenticated_user(str(auth.get('token', '')))
        except HTTPException:
            await socket.close(code=4001)
            return
        character = get_character(user['id'])
        if not character:
            await socket.close(code=4003)
            return
        char_id = character['id']
        try:
            await world.join(character,socket)
        except ValueError:
            await socket.close(code=4004)
            return
        while True:
            data = await socket.receive_json()
            if isinstance(data, dict) and data.get('type') == 'move':
                await world.move(char_id,data)
            elif isinstance(data,dict) and data.get('type')=='attack':
                await world.attack(char_id,data)
    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
    finally:
        if char_id is not None:
            await world.leave(char_id,socket)

@app.get('/')
def index():
    return RedirectResponse('/index.html')

# StaticFiles vem por último para não interceptar rotas da API.
app.mount('/', StaticFiles(directory=ROOT, html=True), name='client')
