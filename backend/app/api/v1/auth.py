from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.services.auth_service import AuthService
from app.core.security import create_access_token, get_current_user

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    portal: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ResendVerifyRequest(BaseModel):
    email: EmailStr

class CheckEmailRequest(BaseModel):
    email: EmailStr


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/register")
async def register(user_data: dict, role: str, db=Depends(get_db)):
    service = AuthService(db)
    try:
        user = await service.register_user(user_data, role)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"msg": "Account created. Please check your email to verify your account."}


@router.post("/login")
async def login(form_data: LoginRequest, db=Depends(get_db)):
    service = AuthService(db)
    result = await service.authenticate_user(
        form_data.email, form_data.password, form_data.portal
    )
    if result is None:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if isinstance(result, dict) and result.get("error") == "ROLE_MISMATCH":
        raise HTTPException(status_code=403, detail=result)

    access_token = create_access_token(data={"sub": str(result["_id"])})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "id": str(result["_id"]),
        "email": result["email"],
        "role": result["role"],
        "is_email_verified": result.get("is_email_verified", False),
    }


@router.post("/check-email")
async def check_email(body: CheckEmailRequest, db=Depends(get_db)):
    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    return {"available": True}


# ─── Email Verification ───────────────────────────────────────────────────────

@router.get("/verify-email")
async def verify_email(token: str, db=Depends(get_db)):
    service = AuthService(db)
    try:
        await service.verify_email(token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"msg": "Email verified successfully. You can now sign in."}


@router.post("/resend-verification")
async def resend_verification(body: ResendVerifyRequest, db=Depends(get_db)):
    service = AuthService(db)
    await service.resend_verification(body.email)
    return {"msg": "If that email exists and is unverified, a new link has been sent."}


# ─── Password Reset ───────────────────────────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db=Depends(get_db)):
    service = AuthService(db)
    await service.forgot_password(body.email)
    # Always return 200 — never reveal if email exists
    return {"msg": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db=Depends(get_db)):
    service = AuthService(db)
    try:
        await service.reset_password(body.token, body.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"msg": "Password reset successfully. You can now sign in."}


# ─── Change Password (authenticated) ─────────────────────────────────────────

@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = AuthService(db)
    try:
        await service.change_password(
            str(current_user["_id"]), body.current_password, body.new_password
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"msg": "Password changed successfully."}
