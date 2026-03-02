from pydantic import BaseModel, Field
from typing import Optional, Literal
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

class UserModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    email: str
    hashed_password: str
    role: Literal["seeker", "employer"]
    full_name: str
    is_active: bool = True

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True