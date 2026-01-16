from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, func

from core.database import Base


class ModuleRegistry(Base):
    __tablename__ = "module_registry"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    module_key = Column(String, nullable=False, index=True)
    dependencies = Column(JSON, nullable=False, default=list)
    health_state = Column(String, default="HEALTHY")
    enabled = Column(Boolean, default=True)
    kill_switch = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
