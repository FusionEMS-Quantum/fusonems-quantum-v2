"""Add telehealth session link to CareFusion exports

Revision ID: a1b2c3d4e5f6
Revises: 2f3d4d1a5b9c
Create Date: 2026-01-25 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "2f3d4d1a5b9c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "carefusion_export_snapshots",
        sa.Column(
            "telehealth_session_uuid",
            sa.String(),
            nullable=True,
        ),
    )
    op.create_index(
        op.f("ix_carefusion_export_snapshots_telehealth_session_uuid"),
        "carefusion_export_snapshots",
        ["telehealth_session_uuid"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_carefusion_export_snapshots_telehealth_session",
        "carefusion_export_snapshots",
        "telehealth_sessions",
        ["telehealth_session_uuid"],
        ["session_uuid"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_carefusion_export_snapshots_telehealth_session",
        table_name="carefusion_export_snapshots",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_carefusion_export_snapshots_telehealth_session_uuid"),
        table_name="carefusion_export_snapshots",
    )
    op.drop_column("carefusion_export_snapshots", "telehealth_session_uuid")
