from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from groq import Groq
import os, json
from datetime import datetime
import difflib
from models import Rewrite

from database import SessionLocal, engine
from models import Base, Review, ReviewFile, ReviewIssue
from schemas import ReviewRequest

# ---------------- INIT ----------------

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Code Review Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- DB DEP ----------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------- ROUTES ----------------

@app.get("/")
def health():
    return {"status": "Backend running"}

@app.post("/review")
def review_code(request: ReviewRequest, db: Session = Depends(get_db)):

    files_payload = [
        {"filename": f.filename, "content": f.content}
        for f in request.files
    ]

    prompt = f"""
You are a senior software engineer performing a professional code review.

Review mode: {request.mode}
Focus areas: {request.focus_areas}

Respond ONLY in valid JSON:

{{
  "summary": "overall assessment",
  "serious_bugs": [{{"file":"","line":"","issue":""}}],
  "high_priority": [],
  "medium_priority": [],
  "low_priority": []
}}

Rules:
- No text outside JSON
- Respect review mode and focus areas
- Include filename and line info

FILES:
{json.dumps(files_payload, indent=2)}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1200
        )

        result = json.loads(response.choices[0].message.content)

    except Exception:
        raise HTTPException(status_code=500, detail="LLM error")

    # --------- SAVE TO DB ---------

    review = Review(
        language=request.language,
        mode=request.mode,
        focus_areas=",".join(request.focus_areas),
        summary=result["summary"],
        created_at=datetime.utcnow()
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    for f in request.files:
        db.add(ReviewFile(
            review_id=review.id,
            filename=f.filename,
            content=f.content
        ))

    for severity in ["serious_bugs", "high_priority", "medium_priority", "low_priority"]:
        for issue in result.get(severity, []):
            db.add(ReviewIssue(
                review_id=review.id,
                severity=severity,
                file=issue["file"],
                line=issue["line"],
                issue=issue["issue"]
            ))

    db.commit()

    return {
        "review_id": review.id,
        "analysis": result
    }

@app.post("/rewrite/{review_id}")
def rewrite_code(review_id: int, db: Session = Depends(get_db)):

    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    files = db.query(ReviewFile).filter(ReviewFile.review_id == review_id).all()
    if not files:
        raise HTTPException(status_code=400, detail="No files to rewrite")

    files_payload = [
        {"filename": f.filename, "content": f.content}
        for f in files
    ]

    prompt = f"""
You are a senior software engineer refactoring code.

Rewrite ALL files to fix serious and high priority issues.
Preserve original functionality.

Respond ONLY in valid JSON:

{{
  "rewritten_files": {{
    "filename.ext": "updated content"
  }}
}}

FILES:
{json.dumps(files_payload, indent=2)}
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1500
    )

    rewritten = json.loads(response.choices[0].message.content)["rewritten_files"]

    results = []

    for f in files:
        new_code = rewritten.get(f.filename, f.content)

        diff = "\n".join(
            difflib.unified_diff(
                f.content.splitlines(),
                new_code.splitlines(),
                fromfile=f.filename,
                tofile=f.filename,
                lineterm=""
            )
        )

        rewrite = Rewrite(
            review_id=review_id,
            filename=f.filename,
            rewritten_content=new_code,
            diff=diff
        )
        db.add(rewrite)

        results.append({
            "filename": f.filename,
            "rewritten": new_code,
            "diff": diff
        })

    db.commit()

    return {
        "review_id": review_id,
        "rewrites": results
    }



@app.get("/history")
def history(db: Session = Depends(get_db)):
    reviews = db.query(Review).order_by(Review.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "language": r.language,
            "mode": r.mode,
            "summary": r.summary,
            "created_at": r.created_at
        }
        for r in reviews
    ]


@app.get("/history/{review_id}")
def get_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Not found")

    issues = db.query(ReviewIssue).filter(
        ReviewIssue.review_id == review_id
    ).all()

    return {
        "id": review.id,
        "summary": review.summary,
        "issues": [
            {
                "severity": i.severity,
                "file": i.file,
                "line": i.line,
                "issue": i.issue
            }
            for i in issues
        ]
    }
