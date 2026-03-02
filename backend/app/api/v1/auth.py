from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.services.auth_service import AuthService
from app.core.security import create_access_token

router = APIRouter()

@router.post("/register")
async def register(user_data: dict, role: str, db=Depends(get_db)):
    service = AuthService(db)
    user = await service.register_user(user_data, role)
    return {"msg": "User created"}

@router.post("/login")
async def login(form_data: dict, db=Depends(get_db)):
    service = AuthService(db)
    result = await service.authenticate_user(
        form_data["email"],
        form_data["password"],
        form_data.get("portal")
    )

    if result is None:
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    if isinstance(result, dict) and result.get("error") == "ROLE_MISMATCH":
        raise HTTPException(status_code=403, detail=result)

    access_token = create_access_token(data={"sub": str(result["_id"])})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "id": str(result["_id"]),       # ← was missing, caused employer_id=undefined
        "email": result["email"],        # ← was missing, caused blank email in header
        "role": result["role"],
    }