from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import DATABASE_URL

# connect_args check_same_thread è solo per SQLite
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from models import Article, Source, RssItem  # noqa: F401
    from sqlalchemy import text

    Base.metadata.create_all(bind=engine)

    # Migrazione: aggiunge colonne mancanti su DB già esistenti
    migrations = [
        ("rss_items", "rss_content", "TEXT"),
        ("articles", "image_url", "TEXT"),
    ]
    with engine.connect() as conn:
        for table, column, col_type in migrations:
            try:
                if DATABASE_URL.startswith("sqlite"):
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                else:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type}"))
                conn.commit()
            except Exception:
                pass  # colonna già presente
