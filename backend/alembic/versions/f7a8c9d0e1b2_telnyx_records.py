"""Add Telnyx call and fax tables

Revision ID: f7a8c9d0e1b2
Revises: ec12d34bf567
Create Date: 2026-01-25 15:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f7a8c9d0e1b2"
down_revision: Union[str, Sequence[str], None] = "ec12d34bf567"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "telnyx_call_summaries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("classification", sa.String(), nullable=True),
        sa.Column("training_mode", sa.Boolean(), nullable=True),
        sa.Column("call_sid", sa.String(), nullable=True),
        sa.Column("caller_number", sa.String(), nullable=True),
        sa.Column("intent", sa.String(), nullable=True),
        sa.Column("transcript", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("ai_model", sa.String(), nullable=True),
        sa.Column("ai_response", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("resolution", sa.String(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_telnyx_call_summaries_id"), "telnyx_call_summaries", ["id"], unique=False)
    op.create_index(op.f("ix_telnyx_call_summaries_org_id"), "telnyx_call_summaries", ["org_id"], unique=False)

    op.create_table(
        "telnyx_fax_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("classification", sa.String(), nullable=True),
        sa.Column("training_mode", sa.Boolean(), nullable=True),
        sa.Column("fax_sid", sa.String(), nullable=True),
        sa.Column("sender_number", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("parsed_facesheet", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("matched_patient_id", sa.Integer(), nullable=True),
        sa.Column("notification_sent", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["matched_patient_id"], ["epcr_patients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_telnyx_fax_records_id"), "telnyx_fax_records", ["id"], unique=False)
    op.create_index(op.f("ix_telnyx_fax_records_org_id"), "telnyx_fax_records", ["org_id"], unique=False)
    op.create_index(op.f("ix_telnyx_fax_records_matched_patient_id"), "telnyx_fax_records", ["matched_patient_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_telnyx_fax_records_matched_patient_id"), table_name="telnyx_fax_records")
    op.drop_index(op.f("ix_telnyx_fax_records_org_id"), table_name="telnyx_fax_records")
    op.drop_index(op.f("ix_telnyx_fax_records_id"), table_name="telnyx_fax_records")
    op.drop_table("telnyx_fax_records")
    op.drop_index(op.f("ix_telnyx_call_summaries_org_id"), table_name="telnyx_call_summaries")
    op.drop_index(op.f("ix_telnyx_call_summaries_id"), table_name="telnyx_call_summaries")
    op.drop_table("telnyx_call_summaries")
