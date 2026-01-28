"""
Position Management Service
Handles job positions, organizational structure, and vacancy tracking
"""
from datetime import date, datetime
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from collections import defaultdict

from models.hr_personnel import Personnel, EmploymentStatus
from utils.tenancy import scoped_query


class PositionService:
    """Service for managing positions and organizational structure"""

    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id

    async def get_org_chart(self) -> Dict[str, Any]:
        """
        Generate organizational chart data
        Returns hierarchical structure of personnel reporting relationships
        """
        all_personnel = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.employment_status == EmploymentStatus.ACTIVE
        ).all()

        # Build hierarchy
        personnel_map = {p.id: self._personnel_to_dict(p) for p in all_personnel}
        
        # Find root nodes (no supervisor)
        roots = []
        for person in all_personnel:
            if not person.supervisor_id:
                roots.append(personnel_map[person.id])
            else:
                # Add to supervisor's direct reports
                if person.supervisor_id in personnel_map:
                    if 'direct_reports' not in personnel_map[person.supervisor_id]:
                        personnel_map[person.supervisor_id]['direct_reports'] = []
                    personnel_map[person.supervisor_id]['direct_reports'].append(
                        personnel_map[person.id]
                    )

        return {
            "organization": roots,
            "total_employees": len(all_personnel),
            "levels": self._calculate_org_levels(roots)
        }

    def _personnel_to_dict(self, person: Personnel) -> Dict[str, Any]:
        """Convert personnel object to dictionary for org chart"""
        return {
            "id": person.id,
            "employee_id": person.employee_id,
            "name": f"{person.first_name} {person.last_name}",
            "email": person.email,
            "job_title": person.job_title,
            "department": person.department,
            "station": person.station_assignment,
            "supervisor_id": person.supervisor_id,
            "direct_reports": []
        }

    def _calculate_org_levels(self, roots: List[Dict]) -> int:
        """Calculate depth of organizational hierarchy"""
        if not roots:
            return 0
        
        max_depth = 0
        for root in roots:
            depth = self._get_node_depth(root)
            max_depth = max(max_depth, depth)
        
        return max_depth

    def _get_node_depth(self, node: Dict) -> int:
        """Recursively calculate depth of a node"""
        if not node.get('direct_reports'):
            return 1
        
        max_child_depth = 0
        for child in node['direct_reports']:
            child_depth = self._get_node_depth(child)
            max_child_depth = max(max_child_depth, child_depth)
        
        return 1 + max_child_depth

    async def get_positions_by_title(
        self,
        job_title: Optional[str] = None,
        department: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all positions grouped by job title
        Shows current headcount vs typical capacity
        """
        query = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.employment_status == EmploymentStatus.ACTIVE
        )

        if job_title:
            query = query.filter(Personnel.job_title.ilike(f"%{job_title}%"))
        if department:
            query = query.filter(Personnel.department == department)

        results = query.with_entities(
            Personnel.job_title,
            Personnel.department,
            func.count(Personnel.id).label('count')
        ).group_by(Personnel.job_title, Personnel.department).all()

        return [
            {
                "job_title": title,
                "department": dept,
                "current_count": count,
                "status": "normal"  # Could be enhanced with capacity rules
            }
            for title, dept, count in results
        ]

    async def get_vacancies(self) -> List[Dict[str, Any]]:
        """
        Identify vacant positions
        Based on recently terminated employees or staffing targets
        """
        # Get terminated personnel from last 90 days
        ninety_days_ago = date.today().replace(day=date.today().day - 90)
        
        recent_terminations = scoped_query(self.db, Personnel, self.org_id).filter(
            and_(
                Personnel.employment_status == EmploymentStatus.TERMINATED,
                Personnel.termination_date >= ninety_days_ago
            )
        ).all()

        vacancies = []
        for person in recent_terminations:
            vacancies.append({
                "position_id": f"VAC-{person.id}",
                "job_title": person.job_title,
                "department": person.department,
                "station": person.station_assignment,
                "vacant_since": person.termination_date.isoformat(),
                "previous_employee": f"{person.first_name} {person.last_name}",
                "reason": person.termination_reason or "Unknown",
                "days_vacant": (date.today() - person.termination_date).days
            })

        return vacancies

    async def get_department_structure(self) -> Dict[str, Any]:
        """
        Get complete department breakdown with headcount and positions
        """
        active_personnel = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.employment_status == EmploymentStatus.ACTIVE
        ).all()

        departments = defaultdict(lambda: {
            "headcount": 0,
            "positions": defaultdict(int),
            "stations": set()
        })

        for person in active_personnel:
            dept = person.department or "Unassigned"
            departments[dept]["headcount"] += 1
            departments[dept]["positions"][person.job_title] += 1
            if person.station_assignment:
                departments[dept]["stations"].add(person.station_assignment)

        # Convert to serializable format
        result = {}
        for dept_name, dept_data in departments.items():
            result[dept_name] = {
                "headcount": dept_data["headcount"],
                "positions": dict(dept_data["positions"]),
                "stations": sorted(list(dept_data["stations"]))
            }

        return result

    async def get_supervisors(self) -> List[Dict[str, Any]]:
        """
        Get all personnel who are supervisors with their direct report count
        """
        supervisors = scoped_query(self.db, Personnel, self.org_id).filter(
            and_(
                Personnel.employment_status == EmploymentStatus.ACTIVE,
                Personnel.id.in_(
                    self.db.query(Personnel.supervisor_id).filter(
                        Personnel.supervisor_id.isnot(None)
                    )
                )
            )
        ).all()

        result = []
        for supervisor in supervisors:
            direct_reports = scoped_query(self.db, Personnel, self.org_id).filter(
                and_(
                    Personnel.supervisor_id == supervisor.id,
                    Personnel.employment_status == EmploymentStatus.ACTIVE
                )
            ).all()

            result.append({
                "id": supervisor.id,
                "employee_id": supervisor.employee_id,
                "name": f"{supervisor.first_name} {supervisor.last_name}",
                "job_title": supervisor.job_title,
                "department": supervisor.department,
                "direct_reports_count": len(direct_reports),
                "direct_reports": [
                    {
                        "id": dr.id,
                        "name": f"{dr.first_name} {dr.last_name}",
                        "job_title": dr.job_title
                    }
                    for dr in direct_reports
                ]
            })

        return result

    async def assign_supervisor(
        self,
        personnel_id: int,
        supervisor_id: Optional[int]
    ) -> Optional[Personnel]:
        """
        Assign or change supervisor for a personnel member
        Validates no circular reporting relationships
        """
        personnel = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.id == personnel_id
        ).first()

        if not personnel:
            return None

        # Validate supervisor exists and is active
        if supervisor_id:
            supervisor = scoped_query(self.db, Personnel, self.org_id).filter(
                and_(
                    Personnel.id == supervisor_id,
                    Personnel.employment_status == EmploymentStatus.ACTIVE
                )
            ).first()

            if not supervisor:
                raise ValueError("Supervisor not found or not active")

            # Check for circular reference
            if self._would_create_circular_reference(personnel_id, supervisor_id):
                raise ValueError("Cannot assign supervisor: would create circular reporting structure")

        personnel.supervisor_id = supervisor_id
        personnel.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(personnel)
        return personnel

    def _would_create_circular_reference(
        self,
        personnel_id: int,
        new_supervisor_id: int
    ) -> bool:
        """
        Check if assigning this supervisor would create a circular reference
        e.g., A reports to B, B reports to C, C reports to A (circular)
        """
        current_id = new_supervisor_id
        visited = set()

        while current_id:
            if current_id == personnel_id:
                return True
            
            if current_id in visited:
                break
            
            visited.add(current_id)
            
            supervisor = scoped_query(self.db, Personnel, self.org_id).filter(
                Personnel.id == current_id
            ).first()
            
            if not supervisor:
                break
            
            current_id = supervisor.supervisor_id

        return False

    async def get_span_of_control_report(self) -> List[Dict[str, Any]]:
        """
        Analyze span of control - how many direct reports each supervisor has
        Helps identify management bottlenecks
        """
        supervisors = await self.get_supervisors()
        
        # Categorize by span of control
        report = {
            "optimal": [],  # 3-7 direct reports
            "too_few": [],  # 1-2 direct reports
            "too_many": [],  # 8+ direct reports
            "summary": {
                "total_supervisors": len(supervisors),
                "avg_span": 0,
                "max_span": 0,
                "min_span": 0
            }
        }

        if supervisors:
            spans = [s['direct_reports_count'] for s in supervisors]
            report["summary"]["avg_span"] = sum(spans) / len(spans)
            report["summary"]["max_span"] = max(spans)
            report["summary"]["min_span"] = min(spans)

            for supervisor in supervisors:
                count = supervisor['direct_reports_count']
                if 3 <= count <= 7:
                    report["optimal"].append(supervisor)
                elif count <= 2:
                    report["too_few"].append(supervisor)
                else:
                    report["too_many"].append(supervisor)

        return report

    async def get_position_analytics(self) -> Dict[str, Any]:
        """
        Comprehensive position analytics
        """
        all_active = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.employment_status == EmploymentStatus.ACTIVE
        ).count()

        all_on_leave = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.employment_status == EmploymentStatus.ON_LEAVE
        ).count()

        terminated_ytd = scoped_query(self.db, Personnel, self.org_id).filter(
            and_(
                Personnel.employment_status == EmploymentStatus.TERMINATED,
                Personnel.termination_date >= date(date.today().year, 1, 1)
            )
        ).count()

        hired_ytd = scoped_query(self.db, Personnel, self.org_id).filter(
            Personnel.hire_date >= date(date.today().year, 1, 1)
        ).count()

        return {
            "current_headcount": all_active,
            "on_leave": all_on_leave,
            "hired_ytd": hired_ytd,
            "terminated_ytd": terminated_ytd,
            "turnover_rate": (terminated_ytd / all_active * 100) if all_active > 0 else 0,
            "net_change_ytd": hired_ytd - terminated_ytd
        }
