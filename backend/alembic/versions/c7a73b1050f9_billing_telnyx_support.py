"""billing claims, ai assist, support interactions

Revision ID: c7a73b1050f9
Revises: 8eca4622d09e
Create Date: 2026-01-24 21:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c7a73b1050f9"
down_revision: Union[str, Sequence[str], None] = "8eca4622d09e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "billing_claims",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("epcr_patient_id", sa.Integer(), nullable=False),
        sa.Column("classification", sa.String(), nullable=True),
        sa.Column("training_mode", sa.Boolean(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("payer_name", sa.String(), nullable=True),
        sa.Column("payer_type", sa.String(), nullable=True),
        sa.Column("denial_reason", sa.String(), nullable=True),
        sa.Column("denial_risk_flags", sa.JSON(), nullable=False),
        sa.Column("total_charge_cents", sa.Integer(), nullable=True),
        sa.Column("exported_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("office_ally_batch_id", sa.String(), nullable=True),
        sa.Column("demographics_snapshot", sa.JSON(), nullable=False),
        sa.Column("medical_necessity_snapshot", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"],),
        sa.ForeignKeyConstraint(["epcr_patient_id"], ["epcr_patients.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_billing_claims_id"), "billing_claims", ["id"], unique=False)
    op.create_index(op.f("ix_billing_claims_org_id"), "billing_claims", ["org_id"], unique=False)
    op.create_index(
        op.f("ix_billing_claims_epcr_patient_id"),
        "billing_claims",
        ["epcr_patient_id"],
        unique=False,
    )

    op.create_table(
        "billing_assist_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("epcr_patient_id", sa.Integer(), nullable=False),
        sa.Column("classification", sa.String(), nullable=True),
        sa.Column("training_mode", sa.Boolean(), nullable=True),
        sa.Column("snapshot_json", sa.JSON(), nullable=False),
        sa.Column("input_payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"],),
        sa.ForeignKeyConstraint(["epcr_patient_id"], ["epcr_patients.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_billing_assist_results_id"),
        "billing_assist_results",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_billing_assist_results_org_id"),
        "billing_assist_results",
        ["org_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_billing_assist_results_epcr_patient_id"),
        "billing_assist_results",
        ["epcr_patient_id"],
        unique=False,
    )

    op.create_table(
        "billing_claim_export_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("claim_id", sa.Integer(), nullable=False),
        sa.Column("classification", sa.String(), nullable=True),
        sa.Column("training_mode", sa.Boolean(), nullable=True),
        sa.Column("export_format", sa.String(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"],),
        sa.ForeignKeyConstraint(["claim_id"], ["billing_claims.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_billing_claim_export_snapshots_id"),
        "billing_claim_export_snapshots",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_billing_claim_export_snapshots_org_id"),
        "billing_claim_export_snapshots",
        ["org_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_billing_claim_export_snapshots_claim_id"),
        "billing_claim_export_snapshots",
        ["claim_id"],
        unique=False,
    )

    op.create_table(
        "support_interactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("classification", sa.String(), nullable=True),
        sa.Column("training_mode", sa.Boolean(), nullable=True),
        sa.Column("channel", sa.String(), nullable=False),
        sa.Column("direction", sa.String(), nullable=True),
        sa.Column("from_number", sa.String(), nullable=True),
        sa.Column("to_number", sa.String(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("resolved_flag", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_support_interactions_id"),
        "support_interactions",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_support_interactions_org_id"),
        "support_interactions",
        ["org_id"],
        unique=False,
    )

    op.create_table(
        "carefusion_export_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("epcr_patient_id", sa.Integer(), nullable=False),
        sa.Column("classification", sa.String(), nullable=True),
        sa.Column("training_mode", sa.Boolean(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("exported_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"],),
        sa.ForeignKeyConstraint(["epcr_patient_id"], ["epcr_patients.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_carefusion_export_snapshots_id"),
        "carefusion_export_snapshots",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_carefusion_export_snapshots_org_id"),
        "carefusion_export_snapshots",
        ["org_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_carefusion_export_snapshots_epcr_patient_id"),
        "carefusion_export_snapshots",
        ["epcr_patient_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_carefusion_export_snapshots_epcr_patient_id"), table_name="carefusion_export_snapshots")
    op.drop_index(op.f("ix_carefusion_export_snapshots_org_id"), table_name="carefusion_export_snapshots")
    op.drop_index(op.f("ix_carefusion_export_snapshots_id"), table_name="carefusion_export_snapshots")
    op.drop_table("carefusion_export_snapshots")
    op.drop_index(op.f("ix_support_interactions_org_id"), table_name="support_interactions")
    op.drop_index(op.f("ix_support_interactions_id"), table_name="support_interactions")
    op.drop_table("support_interactions")
    op.drop_index(op.f("ix_billing_claim_export_snapshots_claim_id"), table_name="billing_claim_export_snapshots")
    op.drop_index(op.f("ix_billing_claim_export_snapshots_org_id"), table_name="billing_claim_export_snapshots")
    op.drop_index(op.f("ix_billing_claim_export_snapshots_id"), table_name="billing_claim_export_snapshots")
    op.drop_table("billing_claim_export_snapshots")
    op.drop_index(op.f("ix_billing_assist_results_epcr_patient_id"), table_name="billing_assist_results")
    op.drop_index(op.f("ix_billing_assist_results_org_id"), table_name="billing_assist_results")
    op.drop_index(op.f("ix_billing_assist_results_id"), table_name="billing_assist_results")
    op.drop_table("billing_assist_results")
    op.drop_index(op.f("ix_billing_claims_epcr_patient_id"), table_name="billing_claims")
    op.drop_index(op.f("ix_billing_claims_org_id"), table_name="billing_claims")
    op.drop_index(op.f("ix_billing_claims_id"), table_name="billing_claims")
    op.drop_table("billing_claims")
