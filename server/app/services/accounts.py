import sqlite3
import time
from fastapi import HTTPException
from app.core.security import hash_password, verify_password, new_token, token_hash
from app.repositories.database import connection

SESSION_SECONDS = 7 * 86400


def register(username: str, password: str):
    username = username.strip().lower()
    if not 3 <= len(username) <= 24 or not username.replace('_', '').isalnum():
        raise HTTPException(400, 'Usuário: 3–24 caracteres, letras, números ou _.')
    if not 8 <= len(password) <= 128:
        raise HTTPException(400, 'Senha: 8–128 caracteres.')
    try:
        with connection() as db:
            db.execute('INSERT INTO users(username,password_hash) VALUES(?,?)', (username, hash_password(password)))
    except sqlite3.IntegrityError:
        raise HTTPException(409, 'Este usuário já existe.')
    return login(username, password)


def login(username: str, password: str):
    with connection() as db:
        user = db.execute('SELECT * FROM users WHERE username=?', (username.strip().lower(),)).fetchone()
        if not user or not verify_password(password, user['password_hash']):
            raise HTTPException(401, 'Credenciais inválidas.')
        token = new_token()
        db.execute('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',
                   (token_hash(token), user['id'], int(time.time()) + SESSION_SECONDS))
    return {'token': token, 'username': user['username']}


def authenticated_user(token: str):
    if not token:
        raise HTTPException(401, 'Autenticação necessária.')
    with connection() as db:
        user = db.execute("""SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id
                          WHERE s.token_hash=? AND s.expires_at>?""",
                          (token_hash(token), int(time.time()))).fetchone()
    if not user:
        raise HTTPException(401, 'Sessão inválida ou expirada.')
    return dict(user)


def logout(token: str):
    with connection() as db:
        db.execute('DELETE FROM sessions WHERE token_hash=?', (token_hash(token),))
