from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATABASE_PATH = ROOT / "server" / "eldoria.sqlite3"
MAX_PLAYERS = 100
WORLD_WIDTH = 80 * 32
WORLD_HEIGHT = 56 * 32
SPAWN_X, SPAWN_Y = 40 * 32 + 16, 28 * 32 + 16
