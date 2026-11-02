from typing import Annotated
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from app.services import accounts, characters

router = APIRouter(prefix='/api')

class Credentials(BaseModel):
    username: str
    password: str

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
