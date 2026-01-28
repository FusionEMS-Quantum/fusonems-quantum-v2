"""add_fax_tables

Revision ID: 20260127_fax_integration
Revises: 20260127_metriport_integration
Create Date: 2026-01-27 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260127_fax_integration'
down_revision = '20260127_metriport_integration'
branch_labels = None
depends_on = None


def upgrade():
    # Create fax_records table
    op.create_table(
        'fax_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('direction', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('sender_number', sa.String(), nullable=False),
        sa.Column('recipient_number', sa.String(), nullable=False),
        sa.Column('sender_name', sa.String(), nullable=False),
        sa.Column('recipient_name', sa.String(), nullable=False),
        sa.Column('has_cover_page', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('cover_page_subject', sa.String(), nullable=False, server_default=''),
        sa.Column('cover_page_message', sa.Text(), nullable=False, server_default=''),
        sa.Column('cover_page_from', sa.String(), nullable=False, server_default=''),
        sa.Column('cover_page_to', sa.String(), nullable=False, server_default=''),
        sa.Column('page_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('duration_seconds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_retries', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('provider', sa.String(), nullable=False, server_default='srfax'),
        sa.Column('provider_fax_id', sa.String(), nullable=False, server_default=''),
        sa.Column('provider_status', sa.String(), nullable=False, server_default=''),
        sa.Column('provider_response', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('document_url', sa.String(), nullable=False, server_default=''),
        sa.Column('document_filename', sa.String(), nullable=False, server_default=''),
        sa.Column('document_content_type', sa.String(), nullable=False, server_default='application/pdf'),
        sa.Column('document_size_bytes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('queued_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=False, server_default=''),
        sa.Column('error_code', sa.String(), nullable=False, server_default=''),
        sa.Column('meta', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('classification', sa.String(), nullable=False, server_default='phi'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('training_mode', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_fax_records_org_id'), 'fax_records', ['org_id'], unique=False)
    op.create_index(op.f('ix_fax_records_direction'), 'fax_records', ['direction'], unique=False)
    op.create_index(op.f('ix_fax_records_status'), 'fax_records', ['status'], unique=False)
    op.create_index(op.f('ix_fax_records_provider_fax_id'), 'fax_records', ['provider_fax_id'], unique=False)

    # Create fax_attachments table
    op.create_table(
        'fax_attachments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('fax_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('original_filename', sa.String(), nullable=False, server_default=''),
        sa.Column('content_type', sa.String(), nullable=False, server_default='application/pdf'),
        sa.Column('size_bytes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('file_url', sa.String(), nullable=False, server_default=''),
        sa.Column('file_path', sa.String(), nullable=False, server_default=''),
        sa.Column('sha256', sa.String(), nullable=False, server_default=''),
        sa.Column('page_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('meta', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('training_mode', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['fax_id'], ['fax_records.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_fax_attachments_org_id'), 'fax_attachments', ['org_id'], unique=False)
    op.create_index(op.f('ix_fax_attachments_fax_id'), 'fax_attachments', ['fax_id'], unique=False)
    op.create_index(op.f('ix_fax_attachments_sha256'), 'fax_attachments', ['sha256'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_fax_attachments_sha256'), table_name='fax_attachments')
    op.drop_index(op.f('ix_fax_attachments_fax_id'), table_name='fax_attachments')
    op.drop_index(op.f('ix_fax_attachments_org_id'), table_name='fax_attachments')
    op.drop_table('fax_attachments')
    
    op.drop_index(op.f('ix_fax_records_provider_fax_id'), table_name='fax_records')
    op.drop_index(op.f('ix_fax_records_status'), table_name='fax_records')
    op.drop_index(op.f('ix_fax_records_direction'), table_name='fax_records')
    op.drop_index(op.f('ix_fax_records_org_id'), table_name='fax_records')
    op.drop_table('fax_records')
