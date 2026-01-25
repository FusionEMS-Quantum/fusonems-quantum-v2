"""support sessions

Revision ID: support_sessions_0001
Revises: bd39170c3e32
Create Date: 2026-01-24 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "support_sessions_0001"
down_revision: Union[str, Sequence[str], None] = "bd39170c3e32"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "support_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("target_user_id", sa.Integer(), nullable=True),
        sa.Column("target_device_id", sa.String(), nullable=True),
        sa.Column("purpose", sa.String(), nullable=False, server_default="mirror"),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consent_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("consented_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("consent_token_hash", sa.String(), nullable=False, server_default=""),
        sa.Column("session_token_hash", sa.String(), nullable=False, server_default=""),
        sa.Column("consent_requested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ),
        sa.ForeignKeyConstraint(["target_user_id"], ["users.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_support_sessions_id"), "support_sessions", ["id"], unique=False)
    op.create_index(op.f("ix_support_sessions_org_id"), "support_sessions", ["org_id"], unique=False)
    op.create_index(op.f("ix_support_sessions_created_by_user_id"), "support_sessions", ["created_by_user_id"], unique=False)
    op.create_index(op.f("ix_support_sessions_target_user_id"), "support_sessions", ["target_user_id"], unique=False)

    op.create_table(
        "support_mirror_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("support_session_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["support_session_id"], ["support_sessions.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_support_mirror_events_support_session_id"),
        "support_mirror_events",
        ["support_session_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_support_mirror_events_support_session_id"), table_name="support_mirror_events")
    op.drop_table("support_mirror_events")
    op.drop_index(op.f("ix_support_sessions_target_user_id"), table_name="support_sessions")
    op.drop_index(op.f("ix_support_sessions_created_by_user_id"), table_name="support_sessions")
    op.drop_index(op.f("ix_support_sessions_org_id"), table_name="support_sessions")
    op.drop_index(op.f("ix_support_sessions_id"), table_name="support_sessions")
    op.drop_table("support_sessions")
