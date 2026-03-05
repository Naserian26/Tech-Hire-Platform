import secrets
from datetime import datetime, timedelta
from app.models.user import UserModel
from app.core.security import verify_password, get_password_hash
from app.services.email_service import send_verification_email, send_password_reset_email

RESET_TOKEN_EXPIRE_HOURS = 1
VERIFY_TOKEN_EXPIRE_HOURS = 24


class AuthService:
    def __init__(self, db):
        self.db = db

    # ─── REGISTER ────────────────────────────────────────────────────────────
    async def register_user(self, user_data: dict, role: str):
        existing = await self.db.users.find_one({"email": user_data["email"]})
        if existing:
            raise ValueError("Email already registered")

        user_dict = user_data.copy()
        user_dict["role"] = role
        user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
        user_dict["is_active"] = True
        user_dict["is_email_verified"] = False          # ← new
        user_dict["email_verify_token"] = secrets.token_urlsafe(32)
        user_dict["email_verify_expires"] = datetime.utcnow() + timedelta(hours=VERIFY_TOKEN_EXPIRE_HOURS)

        new_user = await self.db.users.insert_one(user_dict)
        created = await self.db.users.find_one({"_id": new_user.inserted_id})

        # Send verification email (non-blocking — swallow errors so register still works)
        try:
            await send_verification_email(created["email"], created["email_verify_token"])
        except Exception:
            pass

        return created

    # ─── LOGIN ───────────────────────────────────────────────────────────────
    async def authenticate_user(self, email: str, password: str, portal_role: str):
        user = await self.db.users.find_one({"email": email})
        if not user or not verify_password(password, user["hashed_password"]):
            return None
        if user["role"] != portal_role:
            return {"error": "ROLE_MISMATCH", "actual_role": user["role"]}
        return user

    # ─── VERIFY EMAIL ────────────────────────────────────────────────────────
    async def verify_email(self, token: str):
        user = await self.db.users.find_one({"email_verify_token": token})
        if not user:
            raise ValueError("Invalid or expired verification link.")
        if user.get("email_verify_expires") < datetime.utcnow():
            raise ValueError("Verification link has expired. Please request a new one.")

        await self.db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "is_email_verified": True,
                "email_verify_token": None,
                "email_verify_expires": None,
            }}
        )
        return user

    # ─── RESEND VERIFICATION ─────────────────────────────────────────────────
    async def resend_verification(self, email: str):
        user = await self.db.users.find_one({"email": email})
        if not user:
            return  # silently succeed — don't leak whether email exists
        if user.get("is_email_verified"):
            return

        token = secrets.token_urlsafe(32)
        await self.db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "email_verify_token": token,
                "email_verify_expires": datetime.utcnow() + timedelta(hours=VERIFY_TOKEN_EXPIRE_HOURS),
            }}
        )
        await send_verification_email(user["email"], token)

    # ─── FORGOT PASSWORD ─────────────────────────────────────────────────────
    async def forgot_password(self, email: str):
        user = await self.db.users.find_one({"email": email})
        if not user:
            return  # silently succeed — don't leak whether email exists

        token = secrets.token_urlsafe(32)
        await self.db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "reset_token": token,
                "reset_token_expires": datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS),
            }}
        )
        await send_password_reset_email(user["email"], token)

    # ─── RESET PASSWORD ──────────────────────────────────────────────────────
    async def reset_password(self, token: str, new_password: str):
        user = await self.db.users.find_one({"reset_token": token})
        if not user:
            raise ValueError("Invalid or expired reset link.")
        if user.get("reset_token_expires") < datetime.utcnow():
            raise ValueError("Reset link has expired. Please request a new one.")

        await self.db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "hashed_password": get_password_hash(new_password),
                "reset_token": None,
                "reset_token_expires": None,
            }}
        )
        return user

    # ─── CHANGE PASSWORD (authenticated) ─────────────────────────────────────
    async def change_password(self, user_id: str, current_password: str, new_password: str):
        from bson import ObjectId
        user = await self.db.users.find_one({"_id": ObjectId(user_id)})
        if not user or not verify_password(current_password, user["hashed_password"]):
            raise ValueError("Current password is incorrect.")

        await self.db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"hashed_password": get_password_hash(new_password)}}
        )
