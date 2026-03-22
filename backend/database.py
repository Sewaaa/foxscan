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

    # Migrazione: aggiunge rss_content se non esiste (DB già esistente)
    with engine.connect() as conn:
        try:
            if DATABASE_URL.startswith("sqlite"):
                conn.execute(text("ALTER TABLE rss_items ADD COLUMN rss_content TEXT"))
            else:
                conn.execute(text("ALTER TABLE rss_items ADD COLUMN IF NOT EXISTS rss_content TEXT"))
            conn.commit()
        except Exception:
            pass  # colonna già presente
