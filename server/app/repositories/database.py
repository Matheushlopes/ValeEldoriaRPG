import sqlite3
from contextlib import contextmanager
from app.core.settings import DATABASE_PATH


@contextmanager
def connection():
    con = sqlite3.connect(DATABASE_PATH, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


def initialize():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connection() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
          expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS characters (
          id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
          name TEXT NOT NULL UNIQUE, class_id TEXT NOT NULL,
          x REAL NOT NULL, y REAL NOT NULL,
          level INTEGER NOT NULL DEFAULT 1, xp INTEGER NOT NULL DEFAULT 0,
          gold INTEGER NOT NULL DEFAULT 0, str INTEGER NOT NULL, int INTEGER NOT NULL,
          dex INTEGER NOT NULL, con INTEGER NOT NULL, points INTEGER NOT NULL DEFAULT 0,
          hp REAL NOT NULL DEFAULT 100, mp REAL NOT NULL DEFAULT 40
        );
        CREATE TABLE IF NOT EXISTS loot_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          character_id INTEGER NOT NULL REFERENCES characters(id),
          item_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_loot_owner ON loot_items(character_id);
        """)
