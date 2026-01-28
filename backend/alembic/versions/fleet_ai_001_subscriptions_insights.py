"""add fleet ai subscriptions and insights

Revision ID: fleet_ai_001
Revises: 
Create Date: 2026-01-28

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'fleet_ai_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'fleet_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('push_enabled', sa.Boolean(), default=True),
        sa.Column('email_enabled', sa.Boolean(), default=True),
        sa.Column('sms_enabled', sa.Boolean(), default=False),
        sa.Column('critical_alerts', sa.Boolean(), default=True),
        sa.Column('maintenance_due', sa.Boolean(), default=True),
        sa.Column('maintenance_overdue', sa.Boolean(), default=True),
        sa.Column('dvir_defects', sa.Boolean(), default=True),
        sa.Column('daily_summary', sa.Boolean(), default=False),
        sa.Column('weekly_summary', sa.Boolean(), default=False),
        sa.Column('ai_recommendations', sa.Boolean(), default=True),
        sa.Column('vehicle_down', sa.Boolean(), default=True),
        sa.Column('fuel_alerts', sa.Boolean(), default=False),
        sa.Column('vehicle_ids', sa.JSON(), nullable=False, default=[]),
        sa.Column('quiet_hours_start', sa.Integer(), default=22),
        sa.Column('quiet_hours_end', sa.Integer(), default=6),
        sa.Column('training_mode', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )
    op.create_index('ix_fleet_subscriptions_org_id', 'fleet_subscriptions', ['org_id'])
    op.create_index('ix_fleet_subscriptions_user_id', 'fleet_subscriptions', ['user_id'])

    op.create_table(
        'fleet_ai_insights',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('vehicle_id', sa.Integer(), nullable=True),
        sa.Column('insight_type', sa.String(), default='predictive'),
        sa.Column('priority', sa.String(), default='medium'),
        sa.Column('title', sa.String(), default=''),
        sa.Column('description', sa.String(), default=''),
        sa.Column('estimated_savings', sa.Integer(), nullable=True),
        sa.Column('confidence', sa.Integer(), default=0),
        sa.Column('action_required', sa.String(), default=''),
        sa.Column('action_deadline', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(), default='active'),
        sa.Column('payload', sa.JSON(), nullable=False, default={}),
        sa.Column('training_mode', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['vehicle_id'], ['fleet_vehicles.id']),
    )
    op.create_index('ix_fleet_ai_insights_org_id', 'fleet_ai_insights', ['org_id'])
    op.create_index('ix_fleet_ai_insights_vehicle_id', 'fleet_ai_insights', ['vehicle_id'])


def downgrade():
    op.drop_index('ix_fleet_ai_insights_vehicle_id', 'fleet_ai_insights')
    op.drop_index('ix_fleet_ai_insights_org_id', 'fleet_ai_insights')
    op.drop_table('fleet_ai_insights')
    
    op.drop_index('ix_fleet_subscriptions_user_id', 'fleet_subscriptions')
    op.drop_index('ix_fleet_subscriptions_org_id', 'fleet_subscriptions')
    op.drop_table('fleet_subscriptions')
