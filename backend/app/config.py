from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # 開発用の既定値。公開するときは、環境変数で必ず上書きする
    database_url: str = (
        "postgresql+psycopg://kodomo:kodomo_dev_password@localhost:5432/kodomo_money"
    )
    secret_key: str = "dev-only-secret-change-me"
    # HTTPS で公開するときは true にする(Cookie を HTTPS の通信だけにする)
    cookie_secure: bool = False
    session_max_age_seconds: int = 60 * 60 * 24 * 30


settings = Settings()
