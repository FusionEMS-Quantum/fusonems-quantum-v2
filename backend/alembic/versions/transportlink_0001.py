"""transportlink tables

Revision ID: 2f3d4d1a5b9c
Revises: 8eca4622d09e
Create Date: 2026-01-24 20:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2f3d4d1a5b9c"
down_revision: Union[str, Sequence[str], None] = "8eca4622d09e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "transport_trips",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("classification", sa.String(), nullable=True),
        sa.Column("training_mode", sa.Boolean(), nullable=True),
        sa.Column("transport_type", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("requested_by", sa.String(), nullable=True),
        sa.Column("origin_facility", sa.String(), nullable=True),
        sa.Column("origin_address", sa.String(), nullable=True),
        sa.Column("destination_facility", sa.String(), nullable=True),
        sa.Column("destination_address", sa.String(), nullable=True),
        sa.Column("broker_trip_id", sa.String(), nullable=True),
        sa.Column("broker_name", sa.String(), nullable=True),
        sa.Column("broker_service_type", sa.String(), nullable=True),
        sa.Column("broker_account_id", sa.String(), nullable=True),
        sa.Column("epcr_patient_id", sa.Integer(), nullable=True),
        sa.Column("call_id", sa.Integer(), nullable=True),
        sa.Column("dispatch_id", sa.Integer(), nullable=True),
        sa.Column("unit_id", sa.Integer(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("medical_necessity_status", sa.String(), nullable=True),
        sa.Column("medical_necessity_notes", sa.String(), nullable=True),
        sa.Column("medical_necessity_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pcs_provided", sa.Boolean(), nullable=True),
        sa.Column("pcs_reference", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["call_id"], ["cad_calls.id"]),
        sa.ForeignKeyConstraint(["dispatch_id"], ["cad_dispatches.id"]),
        sa.ForeignKeyConstraint(["epcr_patient_id"], ["epcr_patients.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["unit_id"], ["cad_units.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_transport_trips_call_id"), "transport_trips", ["call_id"], unique=False)
    op.create_index(op.f("ix_transport_trips_dispatch_id"), "transport_trips", ["dispatch_id"], unique=False)
    op.create_index(op.f("ix_transport_trips_epcr_patient_id"), "transport_trips", ["epcr_patient_id"], unique=False)
    op.create_index(op.f("ix_transport_trips_id"), "transport_trips", ["id"], unique=False)
    op.create_index(op.f("ix_transport_trips_org_id"), "transport_trips", ["org_id"], unique=False)
    op.create_index(op.f("ix_transport_trips_unit_id"), "transport_trips", ["unit_id"], unique=False)

    op.create_table(
        "transport_legs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("classification", sa.String(), nullable=True),
        sa.Column("training_mode", sa.Boolean(), nullable=True),
        sa.Column("leg_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("origin_facility", sa.String(), nullable=True),
        sa.Column("origin_address", sa.String(), nullable=True),
        sa.Column("destination_facility", sa.String(), nullable=True),
        sa.Column("destination_address", sa.String(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("call_id", sa.Integer(), nullable=True),
        sa.Column("dispatch_id", sa.Integer(), nullable=True),
        sa.Column("unit_id", sa.Integer(), nullable=True),
        sa.Column("distance_miles", sa.Float(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["call_id"], ["cad_calls.id"]),
        sa.ForeignKeyConstraint(["dispatch_id"], ["cad_dispatches.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["trip_id"], ["transport_trips.id"]),
        sa.ForeignKeyConstraint(["unit_id"], ["cad_units.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_transport_legs_call_id"), "transport_legs", ["call_id"], unique=False)
    op.create_index(op.f("ix_transport_legs_dispatch_id"), "transport_legs", ["dispatch_id"], unique=False)
    op.create_index(op.f("ix_transport_legs_id"), "transport_legs", ["id"], unique=False)
    op.create_index(op.f("ix_transport_legs_org_id"), "transport_legs", ["org_id"], unique=False)
    op.create_index(op.f("ix_transport_legs_trip_id"), "transport_legs", ["trip_id"], unique=False)
    op.create_index(op.f("ix_transport_legs_unit_id"), "transport_legs", ["unit_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_transport_legs_unit_id"), table_name="transport_legs")
    op.drop_index(op.f("ix_transport_legs_trip_id"), table_name="transport_legs")
    op.drop_index(op.f("ix_transport_legs_org_id"), table_name="transport_legs")
    op.drop_index(op.f("ix_transport_legs_id"), table_name="transport_legs")
    op.drop_index(op.f("ix_transport_legs_dispatch_id"), table_name="transport_legs")
    op.drop_index(op.f("ix_transport_legs_call_id"), table_name="transport_legs")
    op.drop_table("transport_legs")
    op.drop_index(op.f("ix_transport_trips_unit_id"), table_name="transport_trips")
    op.drop_index(op.f("ix_transport_trips_org_id"), table_name="transport_trips")
    op.drop_index(op.f("ix_transport_trips_id"), table_name="transport_trips")
    op.drop_index(op.f("ix_transport_trips_epcr_patient_id"), table_name="transport_trips")
    op.drop_index(op.f("ix_transport_trips_dispatch_id"), table_name="transport_trips")
    op.drop_index(op.f("ix_transport_trips_call_id"), table_name="transport_trips")
    op.drop_table("transport_trips")
