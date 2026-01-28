from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import require_roles
from models.user import User, UserRole
import os

router = APIRouter(prefix="/api/admin/protocols", tags=["Protocols"])

UPLOAD_DIR = os.environ.get("PROTOCOL_UPLOAD_DIR", "./uploads/protocols")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/import")
def import_protocol(
    protocol: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    filename = f"{user.org_id}_{protocol.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(protocol.file.read())
    # TODO: Parse/validate protocol, store metadata, trigger review workflow
    return JSONResponse({"status": "success", "filename": filename})
