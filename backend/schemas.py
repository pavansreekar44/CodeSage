from pydantic import BaseModel
from typing import List

class CodeFile(BaseModel):
    filename: str
    content: str

class ReviewRequest(BaseModel):
    language: str
    mode: str
    focus_areas: List[str]
    files: List[CodeFile]
