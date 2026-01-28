"""Comprehensive scheduling module tables

Revision ID: 20260127_scheduling_module
Revises: 20260127_metriport_integration
Create Date: 2026-01-27 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260127_scheduling_module"
down_revision = "20260127_metriport_integration"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "schedule_templates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("recurrence_pattern", sa.String(20), server_default="weekly"),
        sa.Column("recurrence_config", sa.JSON(), server_default="{}"),
        sa.Column("effective_start", sa.Date(), nullable=False),
        sa.Column("effective_end", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("is_default", sa.Boolean(), server_default="false"),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_schedule_template_org_active", "schedule_templates", ["org_id", "is_active"])

    op.create_table(
        "shift_definitions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("template_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("duration_hours", sa.Float(), nullable=False),
        sa.Column("shift_type", sa.String(20), server_default="regular"),
        sa.Column("color", sa.String(7), server_default="#FF6B35"),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("station_id", sa.Integer(), nullable=True),
        sa.Column("unit_id", sa.Integer(), nullable=True),
        sa.Column("min_staff", sa.Integer(), server_default="1"),
        sa.Column("max_staff", sa.Integer(), nullable=True),
        sa.Column("required_certifications", sa.JSON(), server_default="[]"),
        sa.Column("required_skills", sa.JSON(), server_default="[]"),
        sa.Column("pay_multiplier", sa.Float(), server_default="1.0"),
        sa.Column("is_premium", sa.Boolean(), server_default="false"),
        sa.Column("break_duration_minutes", sa.Integer(), server_default="30"),
        sa.Column("allow_split", sa.Boolean(), server_default="false"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["template_id"], ["schedule_templates.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("org_id", "code", name="uq_shift_def_org_code"),
    )
    op.create_index("idx_shift_def_org_active", "shift_definitions", ["org_id", "is_active"])

    op.create_table(
        "schedule_periods",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(20), server_default="draft"),
        sa.Column("is_published", sa.Boolean(), server_default="false"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_by", sa.Integer(), nullable=True),
        sa.Column("publish_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["published_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_period_org_dates", "schedule_periods", ["org_id", "start_date", "end_date"])

    op.create_table(
        "scheduled_shifts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("definition_id", sa.Integer(), nullable=True),
        sa.Column("schedule_period_id", sa.Integer(), nullable=True),
        sa.Column("shift_date", sa.Date(), nullable=False),
        sa.Column("start_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), server_default="draft"),
        sa.Column("station_id", sa.Integer(), nullable=True),
        sa.Column("station_name", sa.String(100), nullable=True),
        sa.Column("unit_id", sa.Integer(), nullable=True),
        sa.Column("unit_name", sa.String(50), nullable=True),
        sa.Column("required_staff", sa.Integer(), server_default="1"),
        sa.Column("assigned_count", sa.Integer(), server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_open", sa.Boolean(), server_default="true"),
        sa.Column("is_overtime", sa.Boolean(), server_default="false"),
        sa.Column("is_critical", sa.Boolean(), server_default="false"),
        sa.Column("coverage_score", sa.Float(), nullable=True),
        sa.Column("classification", sa.String(20), server_default="OPS"),
        sa.Column("training_mode", sa.Boolean(), server_default="false"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_by", sa.Integer(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["definition_id"], ["shift_definitions.id"]),
        sa.ForeignKeyConstraint(["schedule_period_id"], ["schedule_periods.id"]),
        sa.ForeignKeyConstraint(["published_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_scheduled_shift_org_date", "scheduled_shifts", ["org_id", "shift_date"])
    op.create_index("idx_scheduled_shift_status", "scheduled_shifts", ["org_id", "status"])

    op.create_table(
        "shift_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("shift_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("personnel_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("role", sa.String(50), nullable=True),
        sa.Column("position", sa.String(50), nullable=True),
        sa.Column("actual_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("hours_worked", sa.Float(), nullable=True),
        sa.Column("hours_overtime", sa.Float(), server_default="0"),
        sa.Column("is_primary", sa.Boolean(), server_default="true"),
        sa.Column("is_overtime", sa.Boolean(), server_default="false"),
        sa.Column("is_voluntary", sa.Boolean(), server_default="true"),
        sa.Column("acknowledgment_required", sa.Boolean(), server_default="true"),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("swapped_from_id", sa.Integer(), nullable=True),
        sa.Column("swapped_to_id", sa.Integer(), nullable=True),
        sa.Column("classification", sa.String(20), server_default="OPS"),
        sa.Column("training_mode", sa.Boolean(), server_default="false"),
        sa.Column("assigned_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["shift_id"], ["scheduled_shifts.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("shift_id", "user_id", name="uq_shift_user_assignment"),
    )
    op.create_index("idx_assignment_user_shift", "shift_assignments", ["user_id", "shift_id"])
    op.create_index("idx_assignment_status", "shift_assignments", ["org_id", "status"])

    op.create_table(
        "crew_availability",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("availability_type", sa.String(20), server_default="available"),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column("all_day", sa.Boolean(), server_default="true"),
        sa.Column("recurrence_pattern", sa.String(20), server_default="none"),
        sa.Column("recurrence_end", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_availability_user_date", "crew_availability", ["user_id", "date"])
    op.create_index("idx_availability_org_date", "crew_availability", ["org_id", "date"])

    op.create_table(
        "time_off_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("request_type", sa.String(20), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column("partial_day", sa.Boolean(), server_default="false"),
        sa.Column("total_hours", sa.Float(), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.Integer(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("policy_id", sa.Integer(), nullable=True),
        sa.Column("balance_before", sa.Float(), nullable=True),
        sa.Column("balance_after", sa.Float(), nullable=True),
        sa.Column("conflicts_detected", sa.JSON(), server_default="[]"),
        sa.Column("coverage_impact", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_timeoff_user_dates", "time_off_requests", ["user_id", "start_date", "end_date"])
    op.create_index("idx_timeoff_status", "time_off_requests", ["org_id", "status"])

    op.create_table(
        "shift_swap_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("requester_id", sa.Integer(), nullable=False),
        sa.Column("original_assignment_id", sa.Integer(), nullable=False),
        sa.Column("target_user_id", sa.Integer(), nullable=True),
        sa.Column("target_assignment_id", sa.Integer(), nullable=True),
        sa.Column("swap_type", sa.String(20), server_default="swap"),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("requester_approved", sa.Boolean(), nullable=True),
        sa.Column("target_approved", sa.Boolean(), nullable=True),
        sa.Column("supervisor_approved", sa.Boolean(), nullable=True),
        sa.Column("approved_by", sa.Integer(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["requester_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["target_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["original_assignment_id"], ["shift_assignments.id"]),
        sa.ForeignKeyConstraint(["target_assignment_id"], ["shift_assignments.id"]),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_swap_requester", "shift_swap_requests", ["requester_id", "status"])
    op.create_index("idx_swap_target", "shift_swap_requests", ["target_user_id", "status"])

    op.create_table(
        "coverage_requirements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("station_id", sa.Integer(), nullable=True),
        sa.Column("station_name", sa.String(100), nullable=True),
        sa.Column("unit_type", sa.String(50), nullable=True),
        sa.Column("day_of_week", sa.Integer(), nullable=True),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("min_staff", sa.Integer(), nullable=False),
        sa.Column("optimal_staff", sa.Integer(), nullable=True),
        sa.Column("max_staff", sa.Integer(), nullable=True),
        sa.Column("required_certifications", sa.JSON(), server_default="[]"),
        sa.Column("required_roles", sa.JSON(), server_default="[]"),
        sa.Column("priority", sa.Integer(), server_default="1"),
        sa.Column("is_critical", sa.Boolean(), server_default="false"),
        sa.Column("effective_start", sa.Date(), nullable=True),
        sa.Column("effective_end", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_coverage_org_active", "coverage_requirements", ["org_id", "is_active"])

    op.create_table(
        "scheduling_policies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("policy_type", sa.String(50), nullable=False),
        sa.Column("config", sa.JSON(), server_default="{}"),
        sa.Column("max_hours_per_week", sa.Float(), nullable=True),
        sa.Column("max_consecutive_days", sa.Integer(), nullable=True),
        sa.Column("min_rest_hours", sa.Float(), nullable=True),
        sa.Column("max_overtime_hours", sa.Float(), nullable=True),
        sa.Column("overtime_threshold_daily", sa.Float(), server_default="8"),
        sa.Column("overtime_threshold_weekly", sa.Float(), server_default="40"),
        sa.Column("enforce_certifications", sa.Boolean(), server_default="true"),
        sa.Column("enforce_rest_periods", sa.Boolean(), server_default="true"),
        sa.Column("enforce_max_hours", sa.Boolean(), server_default="true"),
        sa.Column("alert_overtime_threshold", sa.Float(), server_default="35"),
        sa.Column("alert_fatigue_threshold", sa.Float(), server_default="48"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("priority", sa.Integer(), server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_policy_org_type", "scheduling_policies", ["org_id", "policy_type"])

    op.create_table(
        "scheduling_alerts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("alert_type", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(20), server_default="warning"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("shift_id", sa.Integer(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("assignment_id", sa.Integer(), nullable=True),
        sa.Column("policy_id", sa.Integer(), nullable=True),
        sa.Column("policy_violated", sa.String(100), nullable=True),
        sa.Column("context_data", sa.JSON(), nullable=True),
        sa.Column("is_acknowledged", sa.Boolean(), server_default="false"),
        sa.Column("acknowledged_by", sa.Integer(), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_resolved", sa.Boolean(), server_default="false"),
        sa.Column("resolved_by", sa.Integer(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["shift_id"], ["scheduled_shifts.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["assignment_id"], ["shift_assignments.id"]),
        sa.ForeignKeyConstraint(["policy_id"], ["scheduling_policies.id"]),
        sa.ForeignKeyConstraint(["acknowledged_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["resolved_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_alert_org_unresolved", "scheduling_alerts", ["org_id", "is_resolved"])
    op.create_index("idx_alert_severity", "scheduling_alerts", ["org_id", "severity"])

    op.create_table(
        "ai_scheduling_recommendations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("recommendation_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("impact_score", sa.Float(), nullable=True),
        sa.Column("shift_id", sa.Integer(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("suggested_action", sa.JSON(), nullable=True),
        sa.Column("alternative_actions", sa.JSON(), server_default="[]"),
        sa.Column("policy_context", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("accepted", sa.Boolean(), nullable=True),
        sa.Column("accepted_by", sa.Integer(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["shift_id"], ["scheduled_shifts.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["accepted_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_ai_rec_org_status", "ai_scheduling_recommendations", ["org_id", "status"])

    op.create_table(
        "overtime_tracking",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("regular_hours", sa.Float(), server_default="0"),
        sa.Column("overtime_hours", sa.Float(), server_default="0"),
        sa.Column("double_time_hours", sa.Float(), server_default="0"),
        sa.Column("projected_regular", sa.Float(), server_default="0"),
        sa.Column("projected_overtime", sa.Float(), server_default="0"),
        sa.Column("overtime_threshold", sa.Float(), server_default="40"),
        sa.Column("estimated_cost", sa.Float(), nullable=True),
        sa.Column("last_calculated", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "period_start", "period_end", name="uq_ot_user_period"),
    )
    op.create_index("idx_ot_user_period", "overtime_tracking", ["user_id", "period_start"])

    op.create_table(
        "fatigue_indicators",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("calculation_date", sa.Date(), nullable=False),
        sa.Column("hours_last_24", sa.Float(), server_default="0"),
        sa.Column("hours_last_48", sa.Float(), server_default="0"),
        sa.Column("hours_last_7_days", sa.Float(), server_default="0"),
        sa.Column("consecutive_days_worked", sa.Integer(), server_default="0"),
        sa.Column("rest_hours_since_last_shift", sa.Float(), nullable=True),
        sa.Column("fatigue_score", sa.Float(), nullable=True),
        sa.Column("risk_level", sa.String(20), nullable=True),
        sa.Column("factors", sa.JSON(), server_default="[]"),
        sa.Column("recommendations", sa.JSON(), server_default="[]"),
        sa.Column("is_flagged", sa.Boolean(), server_default="false"),
        sa.Column("flag_reason", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_fatigue_user_date", "fatigue_indicators", ["user_id", "calculation_date"])
    op.create_index("idx_fatigue_flagged", "fatigue_indicators", ["org_id", "is_flagged"])

    op.create_table(
        "scheduling_audit_log",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("resource_type", sa.String(50), nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("before_state", sa.JSON(), nullable=True),
        sa.Column("after_state", sa.JSON(), nullable=True),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("ai_assisted", sa.Boolean(), server_default="false"),
        sa.Column("ai_recommendation_id", sa.Integer(), nullable=True),
        sa.Column("policy_overrides", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["ai_recommendation_id"], ["ai_scheduling_recommendations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_audit_org_time", "scheduling_audit_log", ["org_id", "created_at"])
    op.create_index("idx_audit_resource", "scheduling_audit_log", ["resource_type", "resource_id"])

    op.create_table(
        "schedule_publications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("period_id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1"),
        sa.Column("published_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("published_by", sa.Integer(), nullable=False),
        sa.Column("snapshot_data", sa.JSON(), nullable=True),
        sa.Column("notification_sent", sa.Boolean(), server_default="false"),
        sa.Column("notification_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["period_id"], ["schedule_periods.id"]),
        sa.ForeignKeyConstraint(["published_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("period_id", "version", name="uq_publication_version"),
    )
    op.create_index("idx_publication_period", "schedule_publications", ["period_id", "version"])

    op.create_table(
        "scheduling_subscription_features",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("subscription_tier", sa.String(50), server_default="base"),
        sa.Column("ai_recommendations_enabled", sa.Boolean(), server_default="false"),
        sa.Column("fatigue_tracking_enabled", sa.Boolean(), server_default="false"),
        sa.Column("predictive_staffing_enabled", sa.Boolean(), server_default="false"),
        sa.Column("overtime_modeling_enabled", sa.Boolean(), server_default="false"),
        sa.Column("scenario_planning_enabled", sa.Boolean(), server_default="false"),
        sa.Column("advanced_analytics_enabled", sa.Boolean(), server_default="false"),
        sa.Column("cross_module_context_enabled", sa.Boolean(), server_default="false"),
        sa.Column("max_schedule_periods", sa.Integer(), server_default="12"),
        sa.Column("max_templates", sa.Integer(), server_default="5"),
        sa.Column("api_rate_limit", sa.Integer(), server_default="1000"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("org_id", name="uq_scheduling_subscription_org"),
    )


def downgrade() -> None:
    op.drop_table("scheduling_subscription_features")
    op.drop_table("schedule_publications")
    op.drop_table("scheduling_audit_log")
    op.drop_table("fatigue_indicators")
    op.drop_table("overtime_tracking")
    op.drop_table("ai_scheduling_recommendations")
    op.drop_table("scheduling_alerts")
    op.drop_table("scheduling_policies")
    op.drop_table("coverage_requirements")
    op.drop_table("shift_swap_requests")
    op.drop_table("time_off_requests")
    op.drop_table("crew_availability")
    op.drop_table("shift_assignments")
    op.drop_table("scheduled_shifts")
    op.drop_table("schedule_periods")
    op.drop_table("shift_definitions")
    op.drop_table("schedule_templates")
