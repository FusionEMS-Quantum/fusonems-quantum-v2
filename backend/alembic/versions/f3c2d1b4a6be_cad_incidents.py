"""cad incidents

Revision ID: f3c2d1b4a6be
Revises: 8eca4622d09e
Create Date: 2026-01-24 20:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f3c2d1b4a6be"
down_revision: Union[str, Sequence[str], None] = "8eca4622d09e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "cad_units",
        sa.Column("unit_type", sa.String(), nullable=False, server_default="BLS"),
    )
    op.alter_column("cad_units", "unit_type", server_default=None)
    op.create_table(
        "cad_incidents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("classification", sa.String(), nullable=True),
        sa.Column("training_mode", sa.Boolean(), nullable=True),
        sa.Column("requesting_facility", sa.String(), nullable=False),
        sa.Column("receiving_facility", sa.String(), nullable=False),
        sa.Column("transport_type", sa.String(), nullable=False),
        sa.Column("priority", sa.String(), nullable=True),
        sa.Column("scheduled_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("transport_link_trip_id", sa.Integer(), nullable=True),
        sa.Column("assigned_unit_id", sa.Integer(), nullable=True),
        sa.Column("eta_minutes", sa.Integer(), nullable=True),
        sa.Column("distance_meters", sa.Float(), nullable=True),
        sa.Column("route_geometry", sa.JSON(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["transport_link_trip_id"], ["transport_trips.id"]),
        sa.ForeignKeyConstraint(["assigned_unit_id"], ["cad_units.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cad_incidents_id"), "cad_incidents", ["id"], unique=False)
    op.create_index(op.f("ix_cad_incidents_org_id"), "cad_incidents", ["org_id"], unique=False)
    op.create_index(
        op.f("ix_cad_incidents_transport_link_trip_id"),
        "cad_incidents",
        ["transport_link_trip_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_cad_incidents_assigned_unit_id"),
        "cad_incidents",
        ["assigned_unit_id"],
        unique=False,
    )
    op.create_table(
        "cad_incident_timelines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("incident_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("recorded_by_id", sa.Integer(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["incident_id"], ["cad_incidents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_cad_incident_timelines_id"), "cad_incident_timelines", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_cad_incident_timelines_org_id"),
        "cad_incident_timelines",
        ["org_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_cad_incident_timelines_incident_id"),
        "cad_incident_timelines",
        ["incident_id"],
        unique=False,
    )
    op.create_table(
        "crewlink_pages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("cad_incident_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["cad_incident_id"], ["cad_incidents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_crewlink_pages_id"), "crewlink_pages", ["id"], unique=False)
    op.create_index(
        op.f("ix_crewlink_pages_org_id"), "crewlink_pages", ["org_id"], unique=False
    )
    op.create_index(
        op.f("ix_crewlink_pages_cad_incident_id"),
        "crewlink_pages",
        ["cad_incident_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_crewlink_pages_cad_incident_id"), table_name="crewlink_pages")
    op.drop_index(op.f("ix_crewlink_pages_org_id"), table_name="crewlink_pages")
    op.drop_index(op.f("ix_crewlink_pages_id"), table_name="crewlink_pages")
    op.drop_table("crewlink_pages")
    op.drop_index(
        op.f("ix_cad_incident_timelines_incident_id"), table_name="cad_incident_timelines"
    )
    op.drop_index(op.f("ix_cad_incident_timelines_org_id"), table_name="cad_incident_timelines")
    op.drop_index(op.f("ix_cad_incident_timelines_id"), table_name="cad_incident_timelines")
    op.drop_table("cad_incident_timelines")
    op.drop_index(op.f("ix_cad_incidents_assigned_unit_id"), table_name="cad_incidents")
    op.drop_index(op.f("ix_cad_incidents_transport_link_trip_id"), table_name="cad_incidents")
    op.drop_index(op.f("ix_cad_incidents_org_id"), table_name="cad_incidents")
    op.drop_index(op.f("ix_cad_incidents_id"), table_name="cad_incidents")
    op.drop_table("cad_incidents")
    op.drop_column("cad_units", "unit_type")
