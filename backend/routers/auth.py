from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import StoreSetting
from backend.schemas import LoginRequest, TokenResponse, UpdateCredentialsRequest
from backend.security import verify_hash, hash_credential, create_access_token, require_admin

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    settings = db.query(StoreSetting).filter(StoreSetting.id == 1).first()
    if not settings:
        from backend.seed import seed_initial_data
        seed_initial_data(db)
        settings = db.query(StoreSetting).filter(StoreSetting.id == 1).first()
    if not settings:
        raise HTTPException(status_code=500, detail="Store settings not initialized")

    username = req.username.strip()
    secret = req.secret.strip()

    is_user_match = (username.lower() == settings.admin_username.lower())
    if not is_user_match:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    # Verify secret strictly against configured admin password
    is_password_valid = verify_hash(secret, settings.admin_password_hash)
    if not is_password_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    token = create_access_token({"sub": settings.admin_username, "role": "admin"})
    return TokenResponse(access_token=token, username=settings.admin_username)

@router.get("/me")
def get_me(admin_payload: dict = Depends(require_admin), db: Session = Depends(get_db)):
    settings = db.query(StoreSetting).filter(StoreSetting.id == 1).first()
    return {
        "username": admin_payload.get("sub", settings.admin_username if settings else "tirabelle.desserts@gmail.com"),
        "role": "admin",
        "authenticated": True
    }

@router.post("/credentials")
def update_credentials(
    req: UpdateCredentialsRequest,
    admin_payload: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    settings = db.query(StoreSetting).filter(StoreSetting.id == 1).first()
    if not settings:
        raise HTTPException(status_code=500, detail="Store settings not initialized")

    # If updating password, verify old_password
    if req.password and req.password.strip():
        if not req.old_password or not req.old_password.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Old password is required to change password")
        if not verify_hash(req.old_password.strip(), settings.admin_password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect old password")
        settings.admin_password_hash = hash_credential(req.password.strip())

    if req.username and req.username.strip():
        settings.admin_username = req.username.strip()

    db.commit()
    return {"success": True, "message": "Credentials updated successfully", "username": settings.admin_username}
