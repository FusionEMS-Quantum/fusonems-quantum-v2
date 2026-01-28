"""
Competency Management Service
Handles skills matrix, proficiency levels, decay tracking, and recertification alerts.
"""
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from models.training_management import (
    TrainingCompetency,
    TrainingEnrollment,
    TrainingSession,
    TrainingCourse,
    FieldTrainingOfficerRecord,
)
from models.hr_personnel import Personnel, Certification


class CompetencyService:
    """Service layer for competency and skills matrix management"""

    # Proficiency levels
    PROFICIENCY_LEVELS = {
        "NOT_PROFICIENT": {"score": 0, "description": "Cannot perform skill"},
        "BASIC": {"score": 1, "description": "Can perform with supervision"},
        "INTERMEDIATE": {"score": 2, "description": "Can perform independently"},
        "ADVANCED": {"score": 3, "description": "Can perform and teach others"},
        "EXPERT": {"score": 4, "description": "Subject matter expert"},
    }

    # Skill decay periods (days until re-evaluation needed)
    DECAY_PERIODS = {
        "HIGH_RISK": 90,  # Critical skills (intubation, surgical airways)
        "MODERATE_RISK": 180,  # Important skills (IV access, cardiac monitoring)
        "LOW_RISK": 365,  # Basic skills (vital signs, patient assessment)
    }

    @staticmethod
    async def create_competency(
        db: Session,
        org_id: int,
        competency_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Create new competency requirement for personnel.
        """
        competency = TrainingCompetency(
            org_id=org_id,
            personnel_id=competency_data["personnel_id"],
            competency_name=competency_data["competency_name"],
            competency_category=competency_data.get("competency_category", "Clinical"),
            required_proficiency_level=competency_data.get("required_proficiency_level", "BASIC"),
            current_proficiency_level=competency_data.get("current_proficiency_level", "NOT_PROFICIENT"),
        )

        db.add(competency)
        db.commit()
        db.refresh(competency)

        return {
            "success": True,
            "competency": competency,
        }

    @staticmethod
    async def evaluate_competency(
        db: Session,
        org_id: int,
        competency_id: int,
        evaluation_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Evaluate and update competency proficiency level.
        """
        competency = (
            db.query(TrainingCompetency)
            .filter(
                TrainingCompetency.id == competency_id,
                TrainingCompetency.org_id == org_id,
            )
            .first()
        )

        if not competency:
            return {"error": "Competency not found"}

        # Update evaluation
        competency.last_evaluated_date = evaluation_data.get("evaluation_date", date.today())
        competency.evaluator_id = evaluation_data["evaluator_id"]
        competency.current_proficiency_level = evaluation_data["proficiency_level"]
        competency.passed_last_evaluation = evaluation_data.get("passed", True)
        competency.notes = evaluation_data.get("notes", "")

        # Calculate next evaluation due date based on risk category
        risk_category = evaluation_data.get("risk_category", "MODERATE_RISK")
        decay_days = CompetencyService.DECAY_PERIODS.get(risk_category, 180)
        competency.next_evaluation_due = competency.last_evaluated_date + timedelta(days=decay_days)

        competency.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(competency)

        return {
            "success": True,
            "competency": competency,
            "next_evaluation_due": competency.next_evaluation_due,
        }

    @staticmethod
    async def get_personnel_competencies(
        db: Session,
        org_id: int,
        personnel_id: int,
        category: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get all competencies for a specific personnel member.
        """
        query = db.query(TrainingCompetency).filter(
            TrainingCompetency.org_id == org_id,
            TrainingCompetency.personnel_id == personnel_id,
        )

        if category:
            query = query.filter(TrainingCompetency.competency_category == category)

        competencies = query.order_by(
            TrainingCompetency.competency_category,
            TrainingCompetency.competency_name,
        ).all()

        # Calculate statistics
        total = len(competencies)
        proficient = sum(
            1 for c in competencies 
            if c.current_proficiency_level not in ["NOT_PROFICIENT", None]
        )
        due_for_eval = sum(
            1 for c in competencies 
            if c.next_evaluation_due and c.next_evaluation_due <= date.today()
        )

        return {
            "personnel_id": personnel_id,
            "total_competencies": total,
            "proficient": proficient,
            "due_for_evaluation": due_for_eval,
            "competency_rate": (proficient / total * 100) if total > 0 else 0,
            "competencies": competencies,
        }

    @staticmethod
    async def get_skills_matrix(
        db: Session,
        org_id: int,
        department: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate organization-wide skills matrix.
        """
        # Get all active personnel
        personnel_query = db.query(Personnel).filter(
            Personnel.org_id == org_id,
            Personnel.employment_status == "active",
        )

        if department:
            personnel_query = personnel_query.filter(Personnel.department == department)

        personnel = personnel_query.all()

        # Build skills matrix
        matrix = []
        for person in personnel:
            competencies = (
                db.query(TrainingCompetency)
                .filter(
                    TrainingCompetency.org_id == org_id,
                    TrainingCompetency.personnel_id == person.id,
                )
                .all()
            )

            # Calculate competency statistics
            total = len(competencies)
            proficient = sum(
                1 for c in competencies 
                if c.current_proficiency_level not in ["NOT_PROFICIENT", None]
            )

            matrix.append({
                "personnel_id": person.id,
                "name": f"{person.first_name} {person.last_name}",
                "position": person.position_title,
                "department": person.department,
                "total_competencies": total,
                "proficient_count": proficient,
                "competency_rate": (proficient / total * 100) if total > 0 else 0,
                "competencies": {
                    c.competency_name: c.current_proficiency_level
                    for c in competencies
                },
            })

        return {
            "organization_id": org_id,
            "department": department,
            "total_personnel": len(personnel),
            "skills_matrix": matrix,
        }

    @staticmethod
    async def track_skill_decay(
        db: Session,
        org_id: int,
    ) -> Dict[str, Any]:
        """
        Track skills requiring re-evaluation due to decay.
        """
        today = date.today()

        # Get overdue competencies
        overdue = (
            db.query(TrainingCompetency)
            .filter(
                TrainingCompetency.org_id == org_id,
                TrainingCompetency.next_evaluation_due < today,
            )
            .order_by(TrainingCompetency.next_evaluation_due)
            .all()
        )

        # Get due soon (within 30 days)
        due_soon = (
            db.query(TrainingCompetency)
            .filter(
                TrainingCompetency.org_id == org_id,
                TrainingCompetency.next_evaluation_due >= today,
                TrainingCompetency.next_evaluation_due <= today + timedelta(days=30),
            )
            .order_by(TrainingCompetency.next_evaluation_due)
            .all()
        )

        # Group by personnel
        personnel_dict = {}
        for comp in overdue + due_soon:
            if comp.personnel_id not in personnel_dict:
                personnel_dict[comp.personnel_id] = {
                    "overdue": [],
                    "due_soon": [],
                }
            
            if comp in overdue:
                personnel_dict[comp.personnel_id]["overdue"].append(comp)
            else:
                personnel_dict[comp.personnel_id]["due_soon"].append(comp)

        return {
            "total_overdue": len(overdue),
            "total_due_soon": len(due_soon),
            "affected_personnel": len(personnel_dict),
            "overdue_competencies": overdue,
            "due_soon_competencies": due_soon,
            "by_personnel": personnel_dict,
        }

    @staticmethod
    async def generate_recertification_alerts(
        db: Session,
        org_id: int,
        days_ahead: int = 60,
    ) -> Dict[str, Any]:
        """
        Generate alerts for upcoming recertification requirements.
        """
        alert_date = date.today() + timedelta(days=days_ahead)

        # Get competencies due for recertification
        due_competencies = (
            db.query(TrainingCompetency)
            .filter(
                TrainingCompetency.org_id == org_id,
                TrainingCompetency.next_evaluation_due <= alert_date,
                TrainingCompetency.next_evaluation_due >= date.today(),
            )
            .order_by(TrainingCompetency.next_evaluation_due)
            .all()
        )

        # Group by urgency
        critical = []  # Due within 14 days
        warning = []   # Due within 30 days
        info = []      # Due within 60 days

        for comp in due_competencies:
            days_until_due = (comp.next_evaluation_due - date.today()).days
            
            if days_until_due <= 14:
                critical.append(comp)
            elif days_until_due <= 30:
                warning.append(comp)
            else:
                info.append(comp)

        return {
            "total_alerts": len(due_competencies),
            "critical": {
                "count": len(critical),
                "competencies": critical,
            },
            "warning": {
                "count": len(warning),
                "competencies": warning,
            },
            "info": {
                "count": len(info),
                "competencies": info,
            },
        }

    @staticmethod
    async def bulk_assign_competencies(
        db: Session,
        org_id: int,
        personnel_ids: List[int],
        competency_names: List[str],
        competency_category: str = "Clinical",
        required_level: str = "BASIC",
    ) -> Dict[str, Any]:
        """
        Bulk assign competencies to multiple personnel.
        """
        created = []
        skipped = []

        for personnel_id in personnel_ids:
            for comp_name in competency_names:
                # Check if already exists
                existing = (
                    db.query(TrainingCompetency)
                    .filter(
                        TrainingCompetency.org_id == org_id,
                        TrainingCompetency.personnel_id == personnel_id,
                        TrainingCompetency.competency_name == comp_name,
                    )
                    .first()
                )

                if existing:
                    skipped.append({
                        "personnel_id": personnel_id,
                        "competency_name": comp_name,
                        "reason": "Already exists",
                    })
                    continue

                # Create new competency
                competency = TrainingCompetency(
                    org_id=org_id,
                    personnel_id=personnel_id,
                    competency_name=comp_name,
                    competency_category=competency_category,
                    required_proficiency_level=required_level,
                    current_proficiency_level="NOT_PROFICIENT",
                )
                db.add(competency)
                created.append({
                    "personnel_id": personnel_id,
                    "competency_name": comp_name,
                })

        db.commit()

        return {
            "total_processed": len(personnel_ids) * len(competency_names),
            "created": len(created),
            "skipped": len(skipped),
            "created_items": created,
            "skipped_items": skipped,
        }

    @staticmethod
    async def get_competency_gap_analysis(
        db: Session,
        org_id: int,
        department: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Analyze competency gaps across organization or department.
        """
        # Get all competencies
        query = db.query(TrainingCompetency).filter(TrainingCompetency.org_id == org_id)

        if department:
            query = query.join(Personnel).filter(Personnel.department == department)

        competencies = query.all()

        # Analyze gaps (where current < required proficiency)
        gaps = []
        for comp in competencies:
            current_score = CompetencyService.PROFICIENCY_LEVELS.get(
                comp.current_proficiency_level, {}
            ).get("score", 0)
            required_score = CompetencyService.PROFICIENCY_LEVELS.get(
                comp.required_proficiency_level, {}
            ).get("score", 1)

            if current_score < required_score:
                gaps.append({
                    "competency_id": comp.id,
                    "personnel_id": comp.personnel_id,
                    "competency_name": comp.competency_name,
                    "current_level": comp.current_proficiency_level,
                    "required_level": comp.required_proficiency_level,
                    "gap_score": required_score - current_score,
                })

        # Group by competency name
        gap_by_skill = {}
        for gap in gaps:
            skill = gap["competency_name"]
            if skill not in gap_by_skill:
                gap_by_skill[skill] = []
            gap_by_skill[skill].append(gap)

        return {
            "total_competencies": len(competencies),
            "total_gaps": len(gaps),
            "gap_rate": (len(gaps) / len(competencies) * 100) if competencies else 0,
            "gaps": gaps,
            "gaps_by_skill": gap_by_skill,
        }

    @staticmethod
    async def get_proficiency_distribution(
        db: Session,
        org_id: int,
        competency_name: str,
    ) -> Dict[str, Any]:
        """
        Get proficiency level distribution for a specific skill.
        """
        competencies = (
            db.query(TrainingCompetency)
            .filter(
                TrainingCompetency.org_id == org_id,
                TrainingCompetency.competency_name == competency_name,
            )
            .all()
        )

        # Count by proficiency level
        distribution = {}
        for level in CompetencyService.PROFICIENCY_LEVELS.keys():
            count = sum(1 for c in competencies if c.current_proficiency_level == level)
            distribution[level] = count

        total = len(competencies)

        return {
            "competency_name": competency_name,
            "total_personnel": total,
            "distribution": distribution,
            "distribution_percentages": {
                level: (count / total * 100) if total > 0 else 0
                for level, count in distribution.items()
            },
        }

    @staticmethod
    async def validate_role_competencies(
        db: Session,
        org_id: int,
        personnel_id: int,
        role_requirements: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Validate that personnel meets all competency requirements for a role.
        """
        results = {
            "valid": True,
            "missing": [],
            "insufficient": [],
            "met": [],
        }

        for requirement in role_requirements:
            competency = (
                db.query(TrainingCompetency)
                .filter(
                    TrainingCompetency.org_id == org_id,
                    TrainingCompetency.personnel_id == personnel_id,
                    TrainingCompetency.competency_name == requirement["competency_name"],
                )
                .first()
            )

            if not competency:
                results["missing"].append(requirement)
                results["valid"] = False
                continue

            # Check proficiency level
            current_score = CompetencyService.PROFICIENCY_LEVELS.get(
                competency.current_proficiency_level, {}
            ).get("score", 0)
            required_score = CompetencyService.PROFICIENCY_LEVELS.get(
                requirement.get("required_level", "BASIC"), {}
            ).get("score", 1)

            if current_score < required_score:
                results["insufficient"].append({
                    "competency": competency,
                    "requirement": requirement,
                })
                results["valid"] = False
            else:
                results["met"].append(competency)

        return results

    @staticmethod
    async def get_competency_analytics(
        db: Session,
        org_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Get competency analytics and trends.
        """
        query = db.query(TrainingCompetency).filter(TrainingCompetency.org_id == org_id)

        if start_date:
            query = query.filter(TrainingCompetency.last_evaluated_date >= start_date)
        if end_date:
            query = query.filter(TrainingCompetency.last_evaluated_date <= end_date)

        competencies = query.all()

        # Calculate metrics
        total = len(competencies)
        evaluated = sum(1 for c in competencies if c.last_evaluated_date)
        passed = sum(1 for c in competencies if c.passed_last_evaluation)
        
        # Category breakdown
        categories = {}
        for comp in competencies:
            cat = comp.competency_category
            if cat not in categories:
                categories[cat] = {"total": 0, "proficient": 0}
            categories[cat]["total"] += 1
            if comp.current_proficiency_level not in ["NOT_PROFICIENT", None]:
                categories[cat]["proficient"] += 1

        return {
            "total_competencies": total,
            "evaluated": evaluated,
            "passed": passed,
            "evaluation_rate": (evaluated / total * 100) if total > 0 else 0,
            "pass_rate": (passed / evaluated * 100) if evaluated > 0 else 0,
            "by_category": categories,
        }
