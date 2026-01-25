"""hems flight request tables

Revision ID: 4b9f1c2d3e4f
Revises: 3d4c5f6a7b8c
Create Date: 2026-01-25 01:30:00.000000

"""
from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4b9f1c2d3e4f"
down_revision: Union[str, Sequence[str], None] = "3d4c5f6a7b8c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _hems_schema() -> str | None:
    url = context.get_context().config.get_main_option("sqlalchemy.url") or ""
    if url.startswith("sqlite"):
        return None
    return "hems"


def _schema_prefix() -> str:
    schema = _hems_schema()
    return f"{schema}." if schema else ""


def upgrade() -> None:
    schema = _hems_schema()
    prefix = _schema_prefix()

    op.add_column(
        "hems_aircraft",
        sa.Column("availability_status", sa.String(), nullable=False, server_default="Available"),
        schema=schema,
    )
    op.add_column(
        "hems_aircraft",
        sa.Column("base", sa.String(), nullable=False, server_default=""),
        schema=schema,
    )

    op.add_column(
        "hems_crew",
        sa.Column("current_status", sa.String(), nullable=False, server_default="Ready"),
        schema=schema,
    )
    op.add_column(
        "hems_crew",
        sa.Column("duty_start", sa.DateTime(timezone=True), nullable=True),
        schema=schema,
    )
    op.add_column(
        "hems_crew",
        sa.Column("duty_end", sa.DateTime(timezone=True), nullable=True),
        schema=schema,
    )

    op.create_table(
        "hems_flight_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("classification", sa.String(), nullable=False, server_default="AVIATION_SAFETY"),
        sa.Column("training_mode", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("request_source", sa.String(), nullable=False),
        sa.Column("requesting_facility", sa.String(), nullable=False),
        sa.Column("sending_location", sa.String(), nullable=False),
        sa.Column("receiving_facility", sa.String(), nullable=False),
        sa.Column("patient_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("priority", sa.String(), nullable=False, server_default="Routine"),
        sa.Column("status", sa.String(), nullable=False, server_default="requested"),
        sa.Column("crew_id", sa.Integer(), nullable=True),
        sa.Column("aircraft_id", sa.Integer(), nullable=True),
        sa.Column("linked_cad_incident_id", sa.Integer(), nullable=True),
        sa.Column("linked_epcr_patient_id", sa.Integer(), nullable=True),
        sa.Column("request_notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["crew_id"], [f"{prefix}hems_crew.id"]),
        sa.ForeignKeyConstraint(["aircraft_id"], [f"{prefix}hems_aircraft.id"]),
        sa.ForeignKeyConstraint(["linked_cad_incident_id"], ["cad_incidents.id"]),
        sa.ForeignKeyConstraint(["linked_epcr_patient_id"], ["epcr_patients.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema=schema,
    )
    op.create_table(
        "hems_flight_request_timeline",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("classification", sa.String(), nullable=False, server_default="AVIATION_SAFETY"),
        sa.Column("training_mode", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("flight_request_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["flight_request_id"], [f"{prefix}hems_flight_requests.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema=schema,
    )


def downgrade() -> None:
    schema = _hems_schema()
    op.drop_table("hems_flight_request_timeline", schema=schema)
    op.drop_table("hems_flight_requests", schema=schema)
    op.drop_column("hems_crew", "duty_end", schema=schema)
    op.drop_column("hems_crew", "duty_start", schema=schema)
    op.drop_column("hems_crew", "current_status", schema=schema)
    op.drop_column("hems_aircraft", "base", schema=schema)
    op.drop_column("hems_aircraft", "availability_status", schema=schema)
