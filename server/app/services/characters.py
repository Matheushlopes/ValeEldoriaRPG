import sqlite3
from fastapi import HTTPException
from app.repositories.database import connection
from app.core.settings import SPAWN_X, SPAWN_Y

STARTERS = {
    'warrior': {'str': 8, 'int': 3, 'dex': 5, 'con': 6},
    'archer': {'str': 5, 'int': 3, 'dex': 9, 'con': 5},
    'mage': {'str': 3, 'int': 9, 'dex': 5, 'con': 5},
}


def get_character(user_id: int):
    with connection() as db:
        row = db.execute('SELECT * FROM characters WHERE user_id=?', (user_id,)).fetchone()
    return dict(row) if row else None


def create_character(user_id: int, name: str, class_id: str):
    name = name.strip()
    if not 2 <= len(name) <= 20 or not all(ch.isalnum() or ch in ' _-' for ch in name):
        raise HTTPException(400, 'Nome inválido (2–20 caracteres).')
    if class_id not in STARTERS:
        raise HTTPException(400, 'Classe inválida.')
    if get_character(user_id):
        raise HTTPException(409, 'Esta conta já possui um personagem.')
    stats = STARTERS[class_id]
    try:
        with connection() as db:
            db.execute("""INSERT INTO characters
                (user_id,name,class_id,x,y,str,int,dex,con,hp,mp)
                VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                (user_id,name,class_id,SPAWN_X,SPAWN_Y,stats['str'],stats['int'],stats['dex'],stats['con'],100,40))
    except sqlite3.IntegrityError:
        raise HTTPException(409, 'Nome já utilizado ou personagem já criado.')
    return get_character(user_id)


def save_position(character_id: int, x: float, y: float):
    with connection() as db:
        db.execute('UPDATE characters SET x=?,y=? WHERE id=?', (x,y,character_id))
