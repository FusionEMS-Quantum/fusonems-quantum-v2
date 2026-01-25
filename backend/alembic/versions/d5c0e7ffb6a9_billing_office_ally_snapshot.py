"""Add Office Ally metadata to billing export snapshots

Revision ID: d5c0e7ffb6a9
Revises: c7a73b1050f9
Create Date: 2026-01-25 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d5c0e7ffb6a9"
down_revision = "c7a73b1050f9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "billing_claim_export_snapshots",
        sa.Column("office_ally_batch_id", sa.String(), nullable=True, server_default=""),
    )
    op.add_column(
        "billing_claim_export_snapshots",
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "billing_claim_export_snapshots",
        sa.Column("ack_status", sa.String(), nullable=True, server_default="pending"),
    )
    op.add_column(
        "billing_claim_export_snapshots",
        sa.Column("ack_payload", sa.JSON(), nullable=True, server_default=sa.text("'{}'")),
    )


def downgrade() -> None:
    op.drop_column("billing_claim_export_snapshots", "ack_payload")
    op.drop_column("billing_claim_export_snapshots", "ack_status")
    op.drop_column("billing_claim_export_snapshots", "submitted_at")
    op.drop_column("billing_claim_export_snapshots", "office_ally_batch_id")
