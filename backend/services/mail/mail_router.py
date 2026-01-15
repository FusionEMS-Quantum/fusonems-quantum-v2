from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.security import require_roles
from models.mail import Message
from models.user import UserRole
from utils.logger import logger


router = APIRouter(prefix="/api/mail", tags=["Mail"])


class MessageCreate(BaseModel):
    channel: str
    recipient: str
    subject: str | None = None
    body: str
    media_url: str | None = None


def _send_telnyx_message(payload: MessageCreate) -> str:
    try:
        import telnyx
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_412_PRECONDITION_FAILED,
            detail="Telnyx SDK not installed",
        ) from exc

    telnyx.api_key = settings.TELNYX_API_KEY
    channel = payload.channel.lower()

    if channel == "sms":
        response = telnyx.Message.create(
            from_=settings.TELNYX_NUMBER,
            to=payload.recipient,
            text=payload.body,
            messaging_profile_id=settings.TELNYX_MESSAGING_PROFILE_ID or None,
        )
        return response.id
    if channel in {"voice", "call"}:
        response = telnyx.Call.create(
            connection_id=settings.TELNYX_CONNECTION_ID,
            to=payload.recipient,
            from_=settings.TELNYX_NUMBER,
        )
        return response.id
    if channel == "fax":
        if not payload.media_url:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Fax requires media_url",
            )
        response = telnyx.Fax.create(
            connection_id=settings.TELNYX_CONNECTION_ID,
            to=payload.recipient,
            from_=settings.TELNYX_NUMBER,
            media_url=payload.media_url,
        )
        return response.id

    return "unsupported"


@router.post("/messages", status_code=status.HTTP_201_CREATED)
def create_message(
    payload: MessageCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    if payload.channel.lower() in {"sms", "fax", "voice", "call"} and not settings.TELNYX_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_412_PRECONDITION_FAILED,
            detail="Telnyx API key not configured",
        )
    message = Message(**payload.dict(exclude={"media_url"}))
    if payload.channel.lower() in {"sms", "fax", "voice", "call"}:
        try:
            telnyx_id = _send_telnyx_message(payload)
            message.status = f"Sent:{telnyx_id}"
        except HTTPException:
            message.status = "Failed"
            raise
        except Exception as exc:
            logger.warning("Telnyx send failed: %s", exc)
            message.status = "Failed"
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("/messages")
def list_messages(db: Session = Depends(get_db)):
    return db.query(Message).order_by(Message.created_at.desc()).all()
