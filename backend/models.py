import json
from datetime import datetime
from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(Text, nullable=False)
    summary = Column(Text)
    body = Column(Text, nullable=False)
    tags = Column(Text)  # JSON array serializzato
    image_url = Column(Text, nullable=True)
    relevance_score = Column(Integer)
    published_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    sources = relationship("Source", back_populates="article", cascade="all, delete-orphan")

    @property
    def tags_list(self) -> list[str]:
        if not self.tags:
            return []
        try:
            return json.loads(self.tags)
        except (json.JSONDecodeError, TypeError):
            return []

    def to_dict(self, include_body: bool = True) -> dict:
        d = {
            "id": self.id,
            "title": self.title,
            "summary": self.summary,
            "tags": self.tags_list,
            "image_url": self.image_url,
            "relevance_score": self.relevance_score,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "sources": [s.to_dict() for s in self.sources],
        }
        if include_body:
            d["body"] = self.body
        return d


class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    article_id = Column(Integer, ForeignKey("articles.id"))
    url = Column(Text, nullable=False)
    domain = Column(Text)
    scraped_at = Column(DateTime, default=datetime.utcnow)

    article = relationship("Article", back_populates="sources")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "url": self.url,
            "domain": self.domain,
            "scraped_at": self.scraped_at.isoformat() if self.scraped_at else None,
        }


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    started_at   = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    duration_s   = Column(Integer, nullable=True)          # secondi interi
    discovered   = Column(Integer, default=0)
    created      = Column(Integer, default=0)
    updated      = Column(Integer, default=0)
    errors       = Column(Integer, default=0)
    skipped      = Column(Boolean, default=False)

    def to_dict(self) -> dict:
        return {
            "id":           self.id,
            "started_at":   self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_s":   self.duration_s,
            "discovered":   self.discovered,
            "created":      self.created,
            "updated":      self.updated,
            "errors":       self.errors,
            "skipped":      self.skipped,
        }


class RssItem(Base):
    __tablename__ = "rss_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    url_hash = Column(Text, unique=True, nullable=False)
    url = Column(Text, nullable=False)
    title = Column(Text)
    feed_source = Column(Text)
    rss_content = Column(Text)  # contenuto/riassunto dal feed RSS, usato come fallback
    discovered_at = Column(DateTime, default=datetime.utcnow)
    processed = Column(Boolean, default=False)
