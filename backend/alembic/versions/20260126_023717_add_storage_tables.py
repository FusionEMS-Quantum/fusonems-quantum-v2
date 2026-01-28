"""Add storage and audit logging tables

Revision ID: 20260126_023717
Revises: 
Create Date: 2026-01-26 02:37:17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20260126_023717'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'storage_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('role', sa.String(length=100), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('device_info', sa.String(length=500), nullable=True),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('file_path', sa.String(length=1000), nullable=False),
        sa.Column('related_object_type', sa.String(length=100), nullable=True),
        sa.Column('related_object_id', sa.String(length=100), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('success', sa.String(length=10), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_storage_audit_logs_user_id'), 'storage_audit_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_storage_audit_logs_timestamp'), 'storage_audit_logs', ['timestamp'], unique=False)
    op.create_index(op.f('ix_storage_audit_logs_action_type'), 'storage_audit_logs', ['action_type'], unique=False)
    op.create_index(op.f('ix_storage_audit_logs_file_path'), 'storage_audit_logs', ['file_path'], unique=False)
    op.create_index(op.f('ix_storage_audit_logs_related_object_type'), 'storage_audit_logs', ['related_object_type'], unique=False)
    op.create_index(op.f('ix_storage_audit_logs_related_object_id'), 'storage_audit_logs', ['related_object_id'], unique=False)

    op.create_table(
        'file_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.String(length=100), nullable=False),
        sa.Column('file_path', sa.String(length=1000), nullable=False),
        sa.Column('original_filename', sa.String(length=500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=200), nullable=False),
        sa.Column('system', sa.String(length=100), nullable=False),
        sa.Column('object_type', sa.String(length=100), nullable=False),
        sa.Column('object_id', sa.String(length=100), nullable=False),
        sa.Column('uploaded_by', sa.Integer(), nullable=True),
        sa.Column('deleted', sa.String(length=10), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_by', sa.Integer(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['deleted_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_file_records_org_id'), 'file_records', ['org_id'], unique=False)
    op.create_index(op.f('ix_file_records_file_path'), 'file_records', ['file_path'], unique=True)
    op.create_index(op.f('ix_file_records_system'), 'file_records', ['system'], unique=False)
    op.create_index(op.f('ix_file_records_object_type'), 'file_records', ['object_type'], unique=False)
    op.create_index(op.f('ix_file_records_object_id'), 'file_records', ['object_id'], unique=False)
    op.create_index(op.f('ix_file_records_uploaded_by'), 'file_records', ['uploaded_by'], unique=False)
    op.create_index(op.f('ix_file_records_deleted'), 'file_records', ['deleted'], unique=False)
    op.create_index(op.f('ix_file_records_created_at'), 'file_records', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_file_records_created_at'), table_name='file_records')
    op.drop_index(op.f('ix_file_records_deleted'), table_name='file_records')
    op.drop_index(op.f('ix_file_records_uploaded_by'), table_name='file_records')
    op.drop_index(op.f('ix_file_records_object_id'), table_name='file_records')
    op.drop_index(op.f('ix_file_records_object_type'), table_name='file_records')
    op.drop_index(op.f('ix_file_records_system'), table_name='file_records')
    op.drop_index(op.f('ix_file_records_file_path'), table_name='file_records')
    op.drop_index(op.f('ix_file_records_org_id'), table_name='file_records')
    op.drop_table('file_records')
    
    op.drop_index(op.f('ix_storage_audit_logs_related_object_id'), table_name='storage_audit_logs')
    op.drop_index(op.f('ix_storage_audit_logs_related_object_type'), table_name='storage_audit_logs')
    op.drop_index(op.f('ix_storage_audit_logs_file_path'), table_name='storage_audit_logs')
    op.drop_index(op.f('ix_storage_audit_logs_action_type'), table_name='storage_audit_logs')
    op.drop_index(op.f('ix_storage_audit_logs_timestamp'), table_name='storage_audit_logs')
    op.drop_index(op.f('ix_storage_audit_logs_user_id'), table_name='storage_audit_logs')
    op.drop_table('storage_audit_logs')
