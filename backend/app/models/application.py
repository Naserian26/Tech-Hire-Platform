from pydantic import BaseModel, Field
from typing import Optional, Literal
from .user import PyObjectId

class ApplicationModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    job_id: PyObjectId
    seeker_id: PyObjectId
    stage: Literal["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"] = "APPLIED"
    created_at: str = Field(default_factory=lambda: str(datetime.utcnow()))

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True