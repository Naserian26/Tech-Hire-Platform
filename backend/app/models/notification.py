from pydantic import BaseModel, Field
from typing import Optional
from .user import PyObjectId

class NotificationModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    type: str
    title: str
    body: str
    is_read: bool = False
    action_url: Optional[str] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True