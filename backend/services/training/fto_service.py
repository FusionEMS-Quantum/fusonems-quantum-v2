"""
Field Training Officer (FTO) Service
Handles FTO program management, daily observations, phase tracking, and competency sign-offs.
"""
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from models.training_management import (
    FieldTrainingOfficerRecord,
    TrainingCompetency,
)
from models.hr_personnel import Personnel


class FTOService:
    """Service layer for Field Training Officer program management"""

    # FTO Program Phases
    PHASES = {
        "ORIENTATION": {
            "name": "Orientation",
            "description": "Introduction to agency operations and protocols",
            "minimum_shifts": 3,
            "passing_score": 75.0,
        },
        "PHASE_1": {
            "name": "Phase 1 - Observation",
            "description": "Trainee observes FTO performing all tasks",
            "minimum_shifts": 5,
            "passing_score": 75.0,
        },
        "PHASE_2": {
            "name": "Phase 2 - Supervised Practice",
            "description": "Trainee performs tasks with FTO supervision",
            "minimum_shifts": 10,
            "passing_score": 80.0,
        },
        "PHASE_3": {
            "name": "Phase 3 - Independent",
            "description": "Trainee performs independently with FTO monitoring",
            "minimum_shifts": 8,
            "passing_score": 85.0,
        },
        "FINAL_EVAL": {
            "name": "Final Evaluation",
            "description": "Comprehensive final evaluation",
            "minimum_shifts": 2,
            "passing_score": 90.0,
        },
    }

    @staticmethod
    async def create_fto_program(
        db: Session,
        org_id: int,
        trainee_id: int,
        fto_id: int,
        start_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Create new FTO program assignment for trainee.
        """
        if not start_date:
            start_date = date.today()

        # Check if trainee already has active FTO program
        existing = (
            db.query(FieldTrainingOfficerRecord)
            .filter(
                FieldTrainingOfficerRecord.org_id == org_id,
                FieldTrainingOfficerRecord.trainee_id == trainee_id,
                FieldTrainingOfficerRecord.program_end_date.is_(None),
            )
            .first()
        )

        if existing:
            return {"error": "Trainee already has active FTO program"}

        # Create initial orientation record
        fto_record = FieldTrainingOfficerRecord(
            org_id=org_id,
            trainee_id=trainee_id,
            fto_id=fto_id,
            program_start_date=start_date,
            phase="ORIENTATION",
            shift_number=1,
            skills_checklist={},
        )

        db.add(fto_record)
        db.commit()
        db.refresh(fto_record)

        return {
            "success": True,
            "fto_record": fto_record,
            "phase_info": FTOService.PHASES["ORIENTATION"],
        }

    @staticmethod
    async def submit_daily_evaluation(
        db: Session,
        org_id: int,
        evaluation_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Submit daily FTO evaluation for trainee shift.
        """
        # Create evaluation record
        fto_record = FieldTrainingOfficerRecord(
            org_id=org_id,
            trainee_id=evaluation_data["trainee_id"],
            fto_id=evaluation_data["fto_id"],
            program_start_date=evaluation_data.get("program_start_date", date.today()),
            phase=evaluation_data["phase"],
            shift_number=evaluation_data["shift_number"],
            communication_score=evaluation_data.get("communication_score", 0),
            patient_care_score=evaluation_data.get("patient_care_score", 0),
            driving_score=evaluation_data.get("driving_score", 0),
            professionalism_score=evaluation_data.get("professionalism_score", 0),
            skills_checklist=evaluation_data.get("skills_checklist", {}),
            fto_comments=evaluation_data.get("fto_comments", ""),
            trainee_self_assessment=evaluation_data.get("trainee_self_assessment", ""),
        )

        # Calculate daily evaluation score (average of all categories)
        scores = [
            fto_record.communication_score or 0,
            fto_record.patient_care_score or 0,
            fto_record.driving_score or 0,
            fto_record.professionalism_score or 0,
        ]
        fto_record.daily_evaluation_score = sum(scores) / len([s for s in scores if s > 0]) if any(scores) else 0

        # Determine if shift passed
        phase_info = FTOService.PHASES.get(fto_record.phase, {})
        passing_score = phase_info.get("passing_score", 75.0)
        fto_record.passed_shift = fto_record.daily_evaluation_score >= passing_score

        db.add(fto_record)
        db.commit()
        db.refresh(fto_record)

        # Check if phase is complete
        phase_complete = await FTOService.check_phase_completion(
            db=db,
            org_id=org_id,
            trainee_id=fto_record.trainee_id,
            phase=fto_record.phase,
        )

        return {
            "success": True,
            "fto_record": fto_record,
            "passed_shift": fto_record.passed_shift,
            "phase_complete": phase_complete["complete"],
            "next_phase": phase_complete.get("next_phase"),
        }

    @staticmethod
    async def check_phase_completion(
        db: Session,
        org_id: int,
        trainee_id: int,
        phase: str,
    ) -> Dict[str, Any]:
        """
        Check if trainee has completed current phase requirements.
        """
        phase_info = FTOService.PHASES.get(phase, {})
        minimum_shifts = phase_info.get("minimum_shifts", 1)
        passing_score = phase_info.get("passing_score", 75.0)

        # Get all evaluations for this phase
        evaluations = (
            db.query(FieldTrainingOfficerRecord)
            .filter(
                FieldTrainingOfficerRecord.org_id == org_id,
                FieldTrainingOfficerRecord.trainee_id == trainee_id,
                FieldTrainingOfficerRecord.phase == phase,
            )
            .order_by(FieldTrainingOfficerRecord.shift_number)
            .all()
        )

        completed_shifts = len(evaluations)
        passed_shifts = sum(1 for e in evaluations if e.passed_shift)
        avg_score = (
            sum(e.daily_evaluation_score for e in evaluations if e.daily_evaluation_score)
            / len([e for e in evaluations if e.daily_evaluation_score])
            if evaluations
            else 0
        )

        # Check completion criteria
        meets_minimum_shifts = completed_shifts >= minimum_shifts
        meets_passing_score = avg_score >= passing_score
        complete = meets_minimum_shifts and meets_passing_score

        # Determine next phase
        phase_order = ["ORIENTATION", "PHASE_1", "PHASE_2", "PHASE_3", "FINAL_EVAL"]
        current_index = phase_order.index(phase) if phase in phase_order else -1
        next_phase = phase_order[current_index + 1] if current_index < len(phase_order) - 1 else None

        return {
            "complete": complete,
            "completed_shifts": completed_shifts,
            "minimum_shifts": minimum_shifts,
            "passed_shifts": passed_shifts,
            "average_score": avg_score,
            "passing_score": passing_score,
            "next_phase": next_phase,
        }

    @staticmethod
    async def advance_to_next_phase(
        db: Session,
        org_id: int,
        trainee_id: int,
        current_phase: str,
    ) -> Dict[str, Any]:
        """
        Advance trainee to next FTO phase.
        """
        # Check if current phase is complete
        phase_status = await FTOService.check_phase_completion(
            db=db,
            org_id=org_id,
            trainee_id=trainee_id,
            phase=current_phase,
        )

        if not phase_status["complete"]:
            return {
                "error": "Current phase not complete",
                "phase_status": phase_status,
            }

        if not phase_status["next_phase"]:
            return {
                "error": "No next phase - program complete",
                "phase_status": phase_status,
            }

        # Get latest FTO assignment
        latest_record = (
            db.query(FieldTrainingOfficerRecord)
            .filter(
                FieldTrainingOfficerRecord.org_id == org_id,
                FieldTrainingOfficerRecord.trainee_id == trainee_id,
            )
            .order_by(desc(FieldTrainingOfficerRecord.created_at))
            .first()
        )

        return {
            "success": True,
            "previous_phase": current_phase,
            "new_phase": phase_status["next_phase"],
            "phase_info": FTOService.PHASES[phase_status["next_phase"]],
            "fto_id": latest_record.fto_id if latest_record else None,
        }

    @staticmethod
    async def get_trainee_progress(
        db: Session,
        org_id: int,
        trainee_id: int,
    ) -> Dict[str, Any]:
        """
        Get comprehensive FTO program progress for trainee.
        """
        # Get all FTO records
        records = (
            db.query(FieldTrainingOfficerRecord)
            .filter(
                FieldTrainingOfficerRecord.org_id == org_id,
                FieldTrainingOfficerRecord.trainee_id == trainee_id,
            )
            .order_by(
                FieldTrainingOfficerRecord.program_start_date,
                FieldTrainingOfficerRecord.shift_number,
            )
            .all()
        )

        if not records:
            return {"error": "No FTO records found"}

        # Get current phase
        current_phase = records[-1].phase

        # Calculate phase statistics
        phase_stats = {}
        for phase in ["ORIENTATION", "PHASE_1", "PHASE_2", "PHASE_3", "FINAL_EVAL"]:
            phase_records = [r for r in records if r.phase == phase]
            if phase_records:
                phase_stats[phase] = {
                    "completed_shifts": len(phase_records),
                    "passed_shifts": sum(1 for r in phase_records if r.passed_shift),
                    "average_score": sum(r.daily_evaluation_score or 0 for r in phase_records) / len(phase_records),
                    "status": await FTOService.check_phase_completion(
                        db=db,
                        org_id=org_id,
                        trainee_id=trainee_id,
                        phase=phase,
                    ),
                }

        # Calculate overall progress
        total_shifts = len(records)
        passed_shifts = sum(1 for r in records if r.passed_shift)
        overall_avg = sum(r.daily_evaluation_score or 0 for r in records) / total_shifts if total_shifts else 0

        return {
            "trainee_id": trainee_id,
            "program_start_date": records[0].program_start_date,
            "current_phase": current_phase,
            "current_fto": records[-1].fto_id,
            "total_shifts": total_shifts,
            "passed_shifts": passed_shifts,
            "overall_average_score": overall_avg,
            "phase_statistics": phase_stats,
            "recent_evaluations": records[-5:],
        }

    @staticmethod
    async def complete_fto_program(
        db: Session,
        org_id: int,
        trainee_id: int,
        completion_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Complete FTO program and mark trainee as cleared.
        """
        # Check if all phases complete
        progress = await FTOService.get_trainee_progress(
            db=db,
            org_id=org_id,
            trainee_id=trainee_id,
        )

        if "error" in progress:
            return progress

        # Check final eval completion
        final_eval_status = progress["phase_statistics"].get("FINAL_EVAL", {}).get("status", {})
        if not final_eval_status.get("complete"):
            return {"error": "Final evaluation not complete"}

        # Update latest record with completion
        latest_record = (
            db.query(FieldTrainingOfficerRecord)
            .filter(
                FieldTrainingOfficerRecord.org_id == org_id,
                FieldTrainingOfficerRecord.trainee_id == trainee_id,
            )
            .order_by(desc(FieldTrainingOfficerRecord.created_at))
            .first()
        )

        if latest_record:
            latest_record.program_end_date = date.today()
            latest_record.fto_comments = (
                f"{latest_record.fto_comments}\n\nProgram Completed: {completion_notes or 'Successfully completed'}"
            )
            db.commit()

        return {
            "success": True,
            "trainee_id": trainee_id,
            "program_start_date": progress["program_start_date"],
            "program_end_date": date.today(),
            "total_shifts": progress["total_shifts"],
            "overall_average_score": progress["overall_average_score"],
        }

    @staticmethod
    async def record_competency_signoff(
        db: Session,
        org_id: int,
        trainee_id: int,
        fto_id: int,
        competency_name: str,
        passed: bool,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Record FTO sign-off for specific competency/skill.
        """
        # Check or create competency record
        competency = (
            db.query(TrainingCompetency)
            .filter(
                TrainingCompetency.org_id == org_id,
                TrainingCompetency.personnel_id == trainee_id,
                TrainingCompetency.competency_name == competency_name,
            )
            .first()
        )

        if not competency:
            competency = TrainingCompetency(
                org_id=org_id,
                personnel_id=trainee_id,
                competency_name=competency_name,
                competency_category="FTO Program",
                required_proficiency_level="Competent",
            )
            db.add(competency)

        # Update competency
        competency.last_evaluated_date = date.today()
        competency.evaluator_id = fto_id
        competency.passed_last_evaluation = passed
        competency.current_proficiency_level = "Competent" if passed else "Not Competent"
        competency.notes = notes or ""
        competency.next_evaluation_due = date.today() + timedelta(days=180)

        db.commit()
        db.refresh(competency)

        return {
            "success": True,
            "competency": competency,
            "signed_off_by": fto_id,
            "sign_off_date": date.today(),
        }

    @staticmethod
    async def get_fto_workload(
        db: Session,
        org_id: int,
        fto_id: int,
    ) -> Dict[str, Any]:
        """
        Get FTO workload and assigned trainees.
        """
        # Get active trainees
        active_records = (
            db.query(FieldTrainingOfficerRecord)
            .filter(
                FieldTrainingOfficerRecord.org_id == org_id,
                FieldTrainingOfficerRecord.fto_id == fto_id,
                FieldTrainingOfficerRecord.program_end_date.is_(None),
            )
            .all()
        )

        active_trainees = list(set(r.trainee_id for r in active_records))

        # Get total evaluations in last 30 days
        thirty_days_ago = date.today() - timedelta(days=30)
        recent_evaluations = (
            db.query(FieldTrainingOfficerRecord)
            .filter(
                FieldTrainingOfficerRecord.org_id == org_id,
                FieldTrainingOfficerRecord.fto_id == fto_id,
                FieldTrainingOfficerRecord.created_at >= thirty_days_ago,
            )
            .count()
        )

        # Get all-time statistics
        total_evaluations = (
            db.query(FieldTrainingOfficerRecord)
            .filter(
                FieldTrainingOfficerRecord.org_id == org_id,
                FieldTrainingOfficerRecord.fto_id == fto_id,
            )
            .count()
        )

        total_trainees = (
            db.query(func.count(func.distinct(FieldTrainingOfficerRecord.trainee_id)))
            .filter(
                FieldTrainingOfficerRecord.org_id == org_id,
                FieldTrainingOfficerRecord.fto_id == fto_id,
            )
            .scalar()
        )

        return {
            "fto_id": fto_id,
            "active_trainees": len(active_trainees),
            "active_trainee_ids": active_trainees,
            "recent_evaluations_30_days": recent_evaluations,
            "total_evaluations": total_evaluations,
            "total_trainees_trained": total_trainees,
        }

    @staticmethod
    async def get_fto_analytics(
        db: Session,
        org_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Get FTO program analytics and metrics.
        """
        query = db.query(FieldTrainingOfficerRecord).filter(FieldTrainingOfficerRecord.org_id == org_id)

        if start_date:
            query = query.filter(FieldTrainingOfficerRecord.created_at >= start_date)
        if end_date:
            query = query.filter(FieldTrainingOfficerRecord.created_at <= end_date)

        records = query.all()

        # Calculate metrics
        total_evaluations = len(records)
        passed_shifts = sum(1 for r in records if r.passed_shift)
        avg_score = (
            sum(r.daily_evaluation_score for r in records if r.daily_evaluation_score)
            / len([r for r in records if r.daily_evaluation_score])
            if records
            else 0
        )

        # Phase distribution
        phase_distribution = {}
        for phase in FTOService.PHASES.keys():
            count = sum(1 for r in records if r.phase == phase)
            phase_distribution[phase] = count

        # Active programs
        active_programs = (
            db.query(func.count(func.distinct(FieldTrainingOfficerRecord.trainee_id)))
            .filter(
                FieldTrainingOfficerRecord.org_id == org_id,
                FieldTrainingOfficerRecord.program_end_date.is_(None),
            )
            .scalar()
        )

        return {
            "total_evaluations": total_evaluations,
            "passed_shifts": passed_shifts,
            "pass_rate": (passed_shifts / total_evaluations * 100) if total_evaluations > 0 else 0,
            "average_score": avg_score,
            "phase_distribution": phase_distribution,
            "active_programs": active_programs,
        }
