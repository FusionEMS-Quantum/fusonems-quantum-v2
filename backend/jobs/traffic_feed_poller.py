import asyncio
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.routing import TrafficFeedSource
from services.routing.service import TrafficFeedIngestionService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def poll_all_traffic_feeds():
    """
    Background job to poll all active traffic feeds.
    Run this every 1-5 minutes via cron or scheduler.
    """
    db: Session = SessionLocal()
    
    try:
        feeds = db.query(TrafficFeedSource).filter(
            TrafficFeedSource.active == True
        ).all()
        
        logger.info(f"Polling {len(feeds)} traffic feeds...")
        
        service = TrafficFeedIngestionService(db)
        
        for feed in feeds:
            should_poll = (
                feed.last_poll_at is None or
                (datetime.utcnow() - feed.last_poll_at).total_seconds() >= feed.poll_interval_seconds
            )
            
            if should_poll:
                logger.info(f"Polling feed: {feed.name}")
                await service.poll_feed(feed)
            else:
                logger.debug(f"Skipping {feed.name} (too soon)")
        
        logger.info("Traffic feed polling complete")
        
    except Exception as e:
        logger.error(f"Traffic feed polling error: {e}")
    finally:
        db.close()


async def expire_old_traffic_events():
    """
    Mark traffic events as inactive if past end_time.
    Run this every 5 minutes.
    """
    db: Session = SessionLocal()
    
    try:
        from models.routing import TrafficEvent
        
        expired = db.query(TrafficEvent).filter(
            TrafficEvent.active == True,
            TrafficEvent.end_time < datetime.utcnow()
        ).all()
        
        for event in expired:
            event.active = False
        
        db.commit()
        
        logger.info(f"Expired {len(expired)} traffic events")
        
    except Exception as e:
        logger.error(f"Traffic event expiration error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(poll_all_traffic_feeds())
    asyncio.run(expire_old_traffic_events())
