"""fire neris enhancements

Revision ID: 3d4c5f6a7b8c
Revises: 2f3d4d1a5b9c
Create Date: 2026-01-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3d4c5f6a7b8c"
down_revision: Union[str, Sequence[str], None] = "2f3d4d1a5b9c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "fire_incidents",
        sa.Column("incident_number", sa.String(), nullable=True),
    )
    op.add_column(
        "fire_incidents",
        sa.Column("neris_category", sa.String(), nullable=False, server_default=""),
    )
    op.add_column(
        "fire_incidents",
        sa.Column("local_descriptor", sa.String(), nullable=False, server_default=""),
    )
    op.add_column(
        "fire_incidents",
        sa.Column("location_latitude", sa.Float(), nullable=True),
    )
    op.add_column(
        "fire_incidents",
        sa.Column("location_longitude", sa.Float(), nullable=True),
    )
    op.add_column(
        "fire_incidents",
        sa.Column("alarm_datetime", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("now()")),
    )
    op.add_column(
        "fire_incidents",
        sa.Column("responding_units", sa.JSON(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "fire_incidents",
        sa.Column("actions_taken", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column(
        "fire_incidents",
        sa.Column("exposures", sa.JSON(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "fire_incidents",
        sa.Column("civilian_casualties", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "fire_incidents",
        sa.Column("civilian_casualty_details", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column(
        "fire_incidents",
        sa.Column("firefighter_casualties", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "fire_incidents",
        sa.Column("firefighter_casualty_details", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column(
        "fire_incidents",
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "fire_incidents",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("now()")),
    )
    op.execute(
        "UPDATE fire_incidents SET incident_number = incident_id WHERE incident_number IS NULL"
    )
    op.alter_column("fire_incidents", "incident_number", nullable=False)
    op.create_index(
        op.f("ix_fire_incidents_incident_number"), "fire_incidents", ["incident_number"], unique=True
    )

    op.create_table(
        "fire_incident_timeline",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("classification", sa.String(), nullable=False, server_default="OPS"),
        sa.Column("training_mode", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("incident_id", sa.Integer(), nullable=False),
        sa.Column("incident_identifier", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("event_data", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["incident_id"], ["fire_incidents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_fire_incident_timeline_id"), "fire_incident_timeline", ["id"], unique=False)
    op.create_index(
        op.f("ix_fire_incident_timeline_incident_id"),
        "fire_incident_timeline",
        ["incident_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_fire_incident_timeline_org_id"),
        "fire_incident_timeline",
        ["org_id"],
        unique=False,
    )

    op.create_table(
        "fire_inventory_hooks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("classification", sa.String(), nullable=False, server_default="OPS"),
        sa.Column("training_mode", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("incident_id", sa.Integer(), nullable=False),
        sa.Column("incident_identifier", sa.String(), nullable=False),
        sa.Column("equipment_type", sa.String(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("usage_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("reported_by", sa.String(), nullable=False, server_default=""),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["incident_id"], ["fire_incidents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_fire_inventory_hooks_id"), "fire_inventory_hooks", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_fire_inventory_hooks_org_id"), "fire_inventory_hooks", ["org_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_fire_inventory_hooks_org_id"), table_name="fire_inventory_hooks")
    op.drop_index(op.f("ix_fire_inventory_hooks_id"), table_name="fire_inventory_hooks")
    op.drop_table("fire_inventory_hooks")
    op.drop_index(op.f("ix_fire_incident_timeline_org_id"), table_name="fire_incident_timeline")
    op.drop_index(
        op.f("ix_fire_incident_timeline_incident_id"), table_name="fire_incident_timeline"
    )
    op.drop_index(op.f("ix_fire_incident_timeline_id"), table_name="fire_incident_timeline")
    op.drop_table("fire_incident_timeline")
    op.drop_index(op.f("ix_fire_incidents_incident_number"), table_name="fire_incidents")
    op.drop_column("fire_incidents", "updated_at")
    op.drop_column("fire_incidents", "closed_at")
    op.drop_column("fire_incidents", "firefighter_casualty_details")
    op.drop_column("fire_incidents", "firefighter_casualties")
    op.drop_column("fire_incidents", "civilian_casualty_details")
    op.drop_column("fire_incidents", "civilian_casualties")
    op.drop_column("fire_incidents", "exposures")
    op.drop_column("fire_incidents", "actions_taken")
    op.drop_column("fire_incidents", "responding_units")
    op.drop_column("fire_incidents", "alarm_datetime")
    op.drop_column("fire_incidents", "location_longitude")
    op.drop_column("fire_incidents", "location_latitude")
    op.drop_column("fire_incidents", "local_descriptor")
    op.drop_column("fire_incidents", "neris_category")
    op.drop_column("fire_incidents", "incident_number")
