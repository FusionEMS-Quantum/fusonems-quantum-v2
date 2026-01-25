"""Create billing ai insights table

Revision ID: ec12d34bf567
Revises: d5c0e7ffb6a9
Create Date: 2026-01-25 13:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "ec12d34bf567"
down_revision: Union[str, Sequence[str], None] = "d5c0e7ffb6a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "billing_ai_insights",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("epcr_patient_id", sa.Integer(), nullable=False),
        sa.Column("classification", sa.String(), nullable=True),
        sa.Column("training_mode", sa.Boolean(), nullable=True),
        sa.Column("insight_type", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("input_payload", sa.JSON(), nullable=False),
        sa.Column("output_payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"],),
        sa.ForeignKeyConstraint(["epcr_patient_id"], ["epcr_patients.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_billing_ai_insights_id"),
        "billing_ai_insights",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_billing_ai_insights_org_id"),
        "billing_ai_insights",
        ["org_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_billing_ai_insights_epcr_patient_id"),
        "billing_ai_insights",
        ["epcr_patient_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_billing_ai_insights_epcr_patient_id"), table_name="billing_ai_insights")
    op.drop_index(op.f("ix_billing_ai_insights_org_id"), table_name="billing_ai_insights")
    op.drop_index(op.f("ix_billing_ai_insights_id"), table_name="billing_ai_insights")
    op.drop_table("billing_ai_insights")
