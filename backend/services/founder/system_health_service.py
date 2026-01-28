from datetime import datetime, timedelta
from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from models.validation import ValidationRule, DataValidationIssue
from models.epcr_core import Patient, NEMSISValidationStatus
from models.exports import ExportJob
from services.storage.health_service import StorageHealthService
from utils.logger import logger


class SystemHealthService:
    
    @staticmethod
    def get_validation_rules_health(db: Session, org_id: int) -> Dict[str, Any]:
        try:
            total_rules = db.query(ValidationRule).filter(
                ValidationRule.org_id == org_id
            ).count()
            
            active_rules = db.query(ValidationRule).filter(
                and_(
                    ValidationRule.org_id == org_id,
                    ValidationRule.status == "active"
                )
            ).count()
            
            inactive_rules = total_rules - active_rules
            
            twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
            
            open_issues = db.query(DataValidationIssue).filter(
                and_(
                    DataValidationIssue.org_id == org_id,
                    DataValidationIssue.status == "Open"
                )
            ).count()
            
            recent_issues = db.query(DataValidationIssue).filter(
                and_(
                    DataValidationIssue.org_id == org_id,
                    DataValidationIssue.created_at >= twenty_four_hours_ago
                )
            ).count()
            
            high_severity_issues = db.query(DataValidationIssue).filter(
                and_(
                    DataValidationIssue.org_id == org_id,
                    DataValidationIssue.status == "Open",
                    DataValidationIssue.severity == "High"
                )
            ).count()
            
            if high_severity_issues > 10:
                status = "CRITICAL"
                message = f"{high_severity_issues} high-severity validation issues"
            elif high_severity_issues > 5:
                status = "DEGRADED"
                message = f"{high_severity_issues} high-severity validation issues"
            elif open_issues > 50:
                status = "WARNING"
                message = f"{open_issues} open validation issues"
            else:
                status = "HEALTHY"
                message = "Validation system operating normally"
            
            return {
                "status": status,
                "message": message,
                "metrics": {
                    "total_rules": total_rules,
                    "active_rules": active_rules,
                    "inactive_rules": inactive_rules,
                    "open_issues": open_issues,
                    "recent_issues_24h": recent_issues,
                    "high_severity_issues": high_severity_issues
                }
            }
        except Exception as e:
            logger.error(f"Failed to get validation rules health: {e}")
            return {
                "status": "UNKNOWN",
                "message": f"Health check failed: {str(e)}",
                "metrics": {}
            }
    
    @staticmethod
    def get_nemsis_system_health(db: Session, org_id: int) -> Dict[str, Any]:
        try:
            total_patients = db.query(Patient).filter(
                Patient.org_id == org_id
            ).count()
            
            finalized_patients = db.query(Patient).filter(
                and_(
                    Patient.org_id == org_id,
                    Patient.status == "billing_ready"
                )
            ).count()
            
            locked_charts = db.query(Patient).filter(
                and_(
                    Patient.org_id == org_id,
                    Patient.chart_locked == True
                )
            ).count()
            
            twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
            
            recent_charts = db.query(Patient).filter(
                and_(
                    Patient.org_id == org_id,
                    Patient.created_at >= twenty_four_hours_ago
                )
            ).count()
            
            avg_qa_score = db.query(func.avg(Patient.qa_score)).filter(
                Patient.org_id == org_id
            ).scalar() or 0
            
            if avg_qa_score < 70:
                status = "DEGRADED"
                message = f"Low average QA score: {avg_qa_score:.1f}"
            elif finalized_patients == 0 and total_patients > 0:
                status = "WARNING"
                message = "No patients billing-ready"
            else:
                status = "HEALTHY"
                message = "NEMSIS system operating normally"
            
            return {
                "status": status,
                "message": message,
                "metrics": {
                    "total_patients": total_patients,
                    "finalized_patients": finalized_patients,
                    "locked_charts": locked_charts,
                    "recent_charts_24h": recent_charts,
                    "avg_qa_score": round(avg_qa_score, 1)
                }
            }
        except Exception as e:
            logger.error(f"Failed to get NEMSIS system health: {e}")
            return {
                "status": "UNKNOWN",
                "message": f"Health check failed: {str(e)}",
                "metrics": {}
            }
    
    @staticmethod
    def get_export_system_health(db: Session, org_id: int) -> Dict[str, Any]:
        try:
            from models.exports import ExportJob
            
            total_exports = db.query(ExportJob).filter(
                ExportJob.org_id == org_id
            ).count()
            
            twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
            
            recent_exports = db.query(ExportJob).filter(
                and_(
                    ExportJob.org_id == org_id,
                    ExportJob.created_at >= twenty_four_hours_ago
                )
            ).count()
            
            failed_exports = db.query(ExportJob).filter(
                and_(
                    ExportJob.org_id == org_id,
                    ExportJob.status == "failed",
                    ExportJob.created_at >= twenty_four_hours_ago
                )
            ).count()
            
            pending_exports = db.query(ExportJob).filter(
                and_(
                    ExportJob.org_id == org_id,
                    ExportJob.status.in_(["pending", "processing"])
                )
            ).count()
            
            completed_exports = db.query(ExportJob).filter(
                and_(
                    ExportJob.org_id == org_id,
                    ExportJob.status == "completed",
                    ExportJob.created_at >= twenty_four_hours_ago
                )
            ).count()
            
            failure_rate = (failed_exports / recent_exports * 100) if recent_exports > 0 else 0
            
            if failure_rate > 20:
                status = "CRITICAL"
                message = f"High export failure rate: {failure_rate:.1f}%"
            elif failure_rate > 10:
                status = "DEGRADED"
                message = f"Elevated export failure rate: {failure_rate:.1f}%"
            elif pending_exports > 10:
                status = "WARNING"
                message = f"{pending_exports} exports pending"
            else:
                status = "HEALTHY"
                message = "Export system operating normally"
            
            return {
                "status": status,
                "message": message,
                "metrics": {
                    "total_exports": total_exports,
                    "recent_exports_24h": recent_exports,
                    "failed_exports_24h": failed_exports,
                    "pending_exports": pending_exports,
                    "completed_exports_24h": completed_exports,
                    "failure_rate_pct": round(failure_rate, 1)
                }
            }
        except Exception as e:
            logger.error(f"Failed to get export system health: {e}")
            return {
                "status": "UNKNOWN",
                "message": f"Health check failed: {str(e)}",
                "metrics": {}
            }
    
    @staticmethod
    def get_builder_systems_health(db: Session, org_id: int) -> Dict[str, Any]:
        return {
            "validation_rules": SystemHealthService.get_validation_rules_health(db, org_id),
            "nemsis": SystemHealthService.get_nemsis_system_health(db, org_id),
            "exports": SystemHealthService.get_export_system_health(db, org_id)
        }
    
    @staticmethod
    def get_unified_system_health(db: Session, org_id: int) -> Dict[str, Any]:
        storage_health = StorageHealthService.get_storage_health(db, org_id=str(org_id))
        
        builders = SystemHealthService.get_builder_systems_health(db, org_id)
        
        all_statuses = [
            storage_health["status"],
            builders["validation_rules"]["status"],
            builders["nemsis"]["status"],
            builders["exports"]["status"]
        ]
        
        if "CRITICAL" in all_statuses:
            overall_status = "CRITICAL"
            overall_message = "One or more critical systems degraded"
        elif "DEGRADED" in all_statuses:
            overall_status = "DEGRADED"
            overall_message = "One or more systems degraded"
        elif "WARNING" in all_statuses:
            overall_status = "WARNING"
            overall_message = "One or more systems have warnings"
        elif "UNKNOWN" in all_statuses:
            overall_status = "WARNING"
            overall_message = "Unable to determine health of one or more systems"
        else:
            overall_status = "HEALTHY"
            overall_message = "All systems healthy"
        
        critical_issues = []
        warnings = []
        
        for system_name, system_data in {
            "Storage": storage_health,
            "Validation Rules": builders["validation_rules"],
            "NEMSIS": builders["nemsis"],
            "Exports": builders["exports"]
        }.items():
            if system_data["status"] == "CRITICAL":
                critical_issues.append(f"{system_name}: {system_data['message']}")
            elif system_data["status"] in ["DEGRADED", "WARNING"]:
                warnings.append(f"{system_name}: {system_data['message']}")
        
        return {
            "overall_status": overall_status,
            "overall_message": overall_message,
            "timestamp": datetime.utcnow().isoformat(),
            "subsystems": {
                "storage": storage_health,
                "validation_rules": builders["validation_rules"],
                "nemsis": builders["nemsis"],
                "exports": builders["exports"]
            },
            "critical_issues": critical_issues,
            "warnings": warnings,
            "requires_immediate_attention": len(critical_issues) > 0
        }
