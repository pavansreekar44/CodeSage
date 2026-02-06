from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    language = Column(String)
    mode = Column(String)
    focus_areas = Column(Text)
    summary = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    files = relationship("ReviewFile", back_populates="review")
    issues = relationship("ReviewIssue", back_populates="review")

class ReviewFile(Base):
    __tablename__ = "review_files"

    id = Column(Integer, primary_key=True)
    review_id = Column(Integer, ForeignKey("reviews.id"))
    filename = Column(String)
    content = Column(Text)

    review = relationship("Review", back_populates="files")

class ReviewIssue(Base):
    __tablename__ = "review_issues"

    id = Column(Integer, primary_key=True)
    review_id = Column(Integer, ForeignKey("reviews.id"))
    severity = Column(String)
    file = Column(String)
    line = Column(String)
    issue = Column(Text)

    review = relationship("Review", back_populates="issues")

class Rewrite(Base):
    __tablename__ = "rewrites"

    id = Column(Integer, primary_key=True)
    review_id = Column(Integer, ForeignKey("reviews.id"))
    filename = Column(String)
    rewritten_content = Column(Text)
    diff = Column(Text)
