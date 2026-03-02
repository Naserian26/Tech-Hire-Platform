from app.models.user import UserModel
from app.core.security import verify_password, get_password_hash, create_access_token

class AuthService:
    def __init__(self, db):
        self.db = db

    async def register_user(self, user_data: dict, role: str):
        existing = await self.db.users.find_one({"email": user_data["email"]})
        if existing:
            raise ValueError("Email already registered")
        
        user_dict = user_data.copy()
        user_dict["role"] = role
        user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
        
        new_user = await self.db.users.insert_one(user_dict)
        return await self.db.users.find_one({"_id": new_user.inserted_id})

    async def authenticate_user(self, email: str, password: str, portal_role: str):
        user = await self.db.users.find_one({"email": email})
        if not user or not verify_password(password, user["hashed_password"]):
            return None
        
        # Role Mismatch Detection
        if user["role"] != portal_role:
            return {"error": "ROLE_MISMATCH", "actual_role": user["role"]}
        
        return user