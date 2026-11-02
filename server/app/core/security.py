import hashlib
import hmac
import secrets


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 260_000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        salt, _ = encoded.split("$", 1)
        return hmac.compare_digest(hash_password(password, salt), encoded)
    except (ValueError, TypeError):
        return False


def new_token() -> str:
    return secrets.token_urlsafe(40)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
