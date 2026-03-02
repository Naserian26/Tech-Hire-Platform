from pydantic import BaseModel, Field
from typing import Optional, List
from .user import PyObjectId

class JobPostingModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    employer_id: PyObjectId
    title: str
    description: str  # HTML from Quill
    skills: List[str]
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True