from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_hasher = PasswordHasher()

# ニックネームが無いときも、同じ時間をかけて確かめるための偽のハッシュ
_DUMMY_HASH = _hasher.hash("dummy-password")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and bool(
            password_hash
        )
    except (VerificationError, InvalidHashError):
        return False
