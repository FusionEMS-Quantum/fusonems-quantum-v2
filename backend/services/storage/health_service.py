from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from models.storage import StorageAuditLog, FileRecord, AuditActionType
from services.storage import get_storage_service
from utils.logger import logger


class StorageHealthService:
    
    @staticmethod
    def get_storage_health(db: Session, org_id: Optional[str] = None) -> Dict[str, Any]:
        try:
            storage = get_storage_service()
            
            is_configured = all([
                storage.bucket_name,
                storage.endpoint,
                storage.region,
                storage.client is not None
            ])
            
            if not is_configured:
                return {
                    "status": "DEGRADED",
                    "configured": False,
                    "message": "Storage service not fully configured",
                    "details": {}
                }
            
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
            
            query = db.query(StorageAuditLog)
            if org_id:
                file_paths_query = db.query(FileRecord.file_path).filter(FileRecord.org_id == org_id)
                file_paths = [fp[0] for fp in file_paths_query.all()]
                if file_paths:
                    query = query.filter(StorageAuditLog.file_path.in_(file_paths))
            
            total_operations_24h = query.filter(
                StorageAuditLog.timestamp >= twenty_four_hours_ago
            ).count()
            
            failed_operations_24h = query.filter(
                and_(
                    StorageAuditLog.timestamp >= twenty_four_hours_ago,
                    StorageAuditLog.success == "false"
                )
            ).count()
            
            recent_operations_1h = query.filter(
                StorageAuditLog.timestamp >= one_hour_ago
            ).count()
            
            failed_recent_1h = query.filter(
                and_(
                    StorageAuditLog.timestamp >= one_hour_ago,
                    StorageAuditLog.success == "false"
                )
            ).count()
            
            file_query = db.query(FileRecord)
            if org_id:
                file_query = file_query.filter(FileRecord.org_id == org_id)
            
            total_files = file_query.filter(FileRecord.deleted == "false").count()
            total_size_bytes = file_query.filter(FileRecord.deleted == "false").with_entities(
                func.sum(FileRecord.file_size)
            ).scalar() or 0
            
            deleted_files = file_query.filter(FileRecord.deleted == "true").count()
            
            total_size_gb = total_size_bytes / (1024 ** 3)
            
            error_rate_24h = (failed_operations_24h / total_operations_24h * 100) if total_operations_24h > 0 else 0
            error_rate_1h = (failed_recent_1h / recent_operations_1h * 100) if recent_operations_1h > 0 else 0
            
            if error_rate_1h > 10:
                status = "CRITICAL"
                message = f"High error rate: {error_rate_1h:.1f}% in last hour"
            elif error_rate_1h > 5:
                status = "DEGRADED"
                message = f"Elevated error rate: {error_rate_1h:.1f}% in last hour"
            elif failed_recent_1h > 0:
                status = "WARNING"
                message = f"{failed_recent_1h} failed operations in last hour"
            else:
                status = "HEALTHY"
                message = "Storage system operating normally"
            
            quota_gb = 250.0
            quota_usage_pct = (total_size_gb / quota_gb * 100) if quota_gb > 0 else 0
            
            if quota_usage_pct > 95:
                status = "CRITICAL"
                message = f"Storage quota critical: {quota_usage_pct:.1f}% used"
            elif quota_usage_pct > 80 and status == "HEALTHY":
                status = "WARNING"
                message = f"Storage quota warning: {quota_usage_pct:.1f}% used"
            
            last_upload = query.filter(
                StorageAuditLog.action_type == AuditActionType.UPLOAD.value
            ).order_by(StorageAuditLog.timestamp.desc()).first()
            
            last_failure = query.filter(
                StorageAuditLog.success == "false"
            ).order_by(StorageAuditLog.timestamp.desc()).first()
            
            return {
                "status": status,
                "configured": True,
                "message": message,
                "bucket": storage.bucket_name,
                "region": storage.region,
                "metrics": {
                    "total_files": total_files,
                    "total_size_gb": round(total_size_gb, 2),
                    "deleted_files": deleted_files,
                    "quota_gb": quota_gb,
                    "quota_usage_pct": round(quota_usage_pct, 1),
                    "operations_24h": total_operations_24h,
                    "failed_operations_24h": failed_operations_24h,
                    "error_rate_24h_pct": round(error_rate_24h, 2),
                    "operations_1h": recent_operations_1h,
                    "failed_operations_1h": failed_recent_1h,
                    "error_rate_1h_pct": round(error_rate_1h, 2),
                },
                "last_upload": last_upload.timestamp.isoformat() if last_upload else None,
                "last_failure": last_failure.timestamp.isoformat() if last_failure else None,
                "last_failure_message": last_failure.error_message if last_failure else None,
            }
            
        except Exception as e:
            logger.error(f"Failed to get storage health: {e}")
            return {
                "status": "CRITICAL",
                "configured": False,
                "message": f"Storage health check failed: {str(e)}",
                "details": {}
            }
    
    @staticmethod
    def get_recent_storage_activity(db: Session, org_id: Optional[str] = None, limit: int = 20) -> list[Dict[str, Any]]:
        query = db.query(StorageAuditLog)
        
        if org_id:
            file_paths_query = db.query(FileRecord.file_path).filter(FileRecord.org_id == org_id)
            file_paths = [fp[0] for fp in file_paths_query.all()]
            if file_paths:
                query = query.filter(StorageAuditLog.file_path.in_(file_paths))
        
        logs = query.order_by(StorageAuditLog.timestamp.desc()).limit(limit).all()
        
        return [
            {
                "timestamp": log.timestamp.isoformat(),
                "action_type": log.action_type,
                "file_path": log.file_path,
                "user_id": log.user_id,
                "success": log.success == "true",
                "error_message": log.error_message if log.success == "false" else None
            }
            for log in logs
        ]
    
    @staticmethod
    def get_storage_breakdown(db: Session, org_id: Optional[str] = None) -> Dict[str, Any]:
        query = db.query(FileRecord).filter(FileRecord.deleted == "false")
        
        if org_id:
            query = query.filter(FileRecord.org_id == org_id)
        
        by_system = db.query(
            FileRecord.system,
            func.count(FileRecord.id).label('count'),
            func.sum(FileRecord.file_size).label('size')
        ).filter(FileRecord.deleted == "false")
        
        if org_id:
            by_system = by_system.filter(FileRecord.org_id == org_id)
        
        by_system = by_system.group_by(FileRecord.system).all()
        
        breakdown = []
        for system, count, size_bytes in by_system:
            size_bytes = size_bytes or 0
            breakdown.append({
                "system": system,
                "file_count": count,
                "size_mb": round(size_bytes / (1024 ** 2), 2),
                "size_gb": round(size_bytes / (1024 ** 3), 3)
            })
        
        breakdown.sort(key=lambda x: x['size_gb'], reverse=True)
        
        return {
            "by_system": breakdown,
            "total_systems": len(breakdown)
        }
    
    @staticmethod
    def get_failed_operations(db: Session, org_id: Optional[str] = None, limit: int = 50) -> list[Dict[str, Any]]:
        query = db.query(StorageAuditLog).filter(StorageAuditLog.success == "false")
        
        if org_id:
            file_paths_query = db.query(FileRecord.file_path).filter(FileRecord.org_id == org_id)
            file_paths = [fp[0] for fp in file_paths_query.all()]
            if file_paths:
                query = query.filter(StorageAuditLog.file_path.in_(file_paths))
        
        failures = query.order_by(StorageAuditLog.timestamp.desc()).limit(limit).all()
        
        return [
            {
                "timestamp": fail.timestamp.isoformat(),
                "action_type": fail.action_type,
                "file_path": fail.file_path,
                "user_id": fail.user_id,
                "error_message": fail.error_message,
                "ip_address": fail.ip_address
            }
            for fail in failures
        ]
