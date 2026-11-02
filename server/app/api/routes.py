from typing import Annotated
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from app.services import accounts, characters
from app.services.world import world

router = APIRouter(prefix='/api')

class Credentials(BaseModel):
    username: str
    password: str

class SpendPoint(BaseModel):
    stat: str

class NewCharacter(BaseModel):
    name: str
    class_id: str


def current_user(authorization: Annotated[str | None, Header()] = None):
    token = (authorization or '').removeprefix('Bearer ').strip()
    return accounts.authenticated_user(token)

@router.post('/register')
def register(data: Credentials):
    return accounts.register(data.username, data.password)

@router.post('/login')
def login(data: Credentials):
    return accounts.login(data.username, data.password)

@router.get('/me')
def me(user=Depends(current_user)):
    return {'user': user, 'character': characters.get_character(user['id'])}

@router.post('/characters', status_code=201)
def create(data: NewCharacter, user=Depends(current_user)):
    return characters.create_character(user['id'], data.name, data.class_id)

@router.post('/characters/points')
async def spend_point(data: SpendPoint, user=Depends(current_user)):
    result = characters.spend_attribute_point(user['id'], data.stat)
    await world.sync_attributes(result['id'], result)
    return result

@router.get('/ranking')
def ranking(limit: int = 50, user=Depends(current_user)):
    from app.repositories.database import connection
    with connection() as db:
        rows = db.execute("SELECT name, class_id, level, xp FROM characters ORDER BY level DESC, xp DESC, name COLLATE NOCASE ASC LIMIT ?", (max(1,min(limit,100)),)).fetchall()
    return {'players': [dict(position=i+1, **dict(row)) for i,row in enumerate(rows)]}

@router.post('/logout')
def logout(authorization: Annotated[str | None, Header()] = None):
    accounts.logout((authorization or '').removeprefix('Bearer ').strip())
    return {'ok': True}


@router.get('/inventory')
def get_inventory(user=Depends(current_user)):
    from app.services import loot
    character = characters.get_character(user['id'])
    if not character: raise HTTPException(404, 'Personagem não encontrado.')
    return {'items': loot.list_items(character['id'])}

@router.delete('/inventory/{item_id}')
def delete_inventory_item(item_id: int, user=Depends(current_user)):
    from app.services import loot
    character = characters.get_character(user['id'])
    if not character: raise HTTPException(404, 'Personagem não encontrado.')
    if not loot.discard_item(character['id'], item_id): raise HTTPException(404, 'Item não encontrado.')
    return {'ok': True}

@router.delete('/inventory')
def delete_inventory(user=Depends(current_user)):
    from app.services import loot
    character = characters.get_character(user['id'])
    if not character: raise HTTPException(404, 'Personagem não encontrado.')
    return {'removed': loot.discard_all(character['id'])}
