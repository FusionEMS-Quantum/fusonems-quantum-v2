import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from models.recommendations import CallType
from services.recommendations.service import UnitRecommendationService
from services.routing.service import RoutingService


async def test_911_scenario():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        routing_service = RoutingService(db)
        recommendation_service = UnitRecommendationService(db, routing_service)
        
        result = await recommendation_service.recommend_units(
            call_id="test-911-001",
            call_type=CallType.EMERGENCY_911,
            scene_lat=40.7128,
            scene_lon=-74.0060,
            required_capabilities=["ALS"],
            patient_acuity="CRITICAL",
            top_n=3
        )
        
        print("=== 911 Emergency Call Test ===")
        print(f"Confidence: {result['confidence']}")
        print(f"Top Recommendations: {len(result['recommendations'])}")
        
        for i, rec in enumerate(result['recommendations'][:3], 1):
            print(f"\n{i}. {rec['unit_name']} ({rec['unit_type']})")
            print(f"   ETA: {rec['eta_minutes']:.1f} min")
            print(f"   Total Score: {rec['total_score']:.2f}")
            print(f"   Explanation: {rec['explanation']}")


async def test_ift_scenario():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        routing_service = RoutingService(db)
        recommendation_service = UnitRecommendationService(db, routing_service)
        
        result = await recommendation_service.recommend_units(
            call_id="test-ift-001",
            call_type=CallType.IFT,
            scene_lat=34.0522,
            scene_lon=-118.2437,
            required_capabilities=["BLS", "WHEELCHAIR"],
            transport_destination_lat=34.0689,
            transport_destination_lon=-118.4452,
            top_n=3
        )
        
        print("\n=== IFT Transport Test ===")
        print(f"Confidence: {result['confidence']}")
        print(f"Top Recommendations: {len(result['recommendations'])}")
        
        for i, rec in enumerate(result['recommendations'][:3], 1):
            print(f"\n{i}. {rec['unit_name']} ({rec['unit_type']})")
            print(f"   ETA: {rec['eta_minutes']:.1f} min")
            print(f"   Total Score: {rec['total_score']:.2f}")
            print(f"   Capability Score: {rec['capability_score']:.2f}")
            print(f"   Cost Score: {rec['cost_score']:.2f}")


async def test_hems_scenario():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        routing_service = RoutingService(db)
        recommendation_service = UnitRecommendationService(db, routing_service)
        
        result = await recommendation_service.recommend_units(
            call_id="test-hems-001",
            call_type=CallType.HEMS,
            scene_lat=36.1699,
            scene_lon=-115.1398,
            required_capabilities=["FLIGHT", "CRITICAL_CARE"],
            patient_acuity="CRITICAL",
            top_n=3
        )
        
        print("\n=== HEMS Flight Test ===")
        print(f"Confidence: {result['confidence']}")
        print(f"Top Recommendations: {len(result['recommendations'])}")
        
        for i, rec in enumerate(result['recommendations'][:3], 1):
            print(f"\n{i}. {rec['unit_name']} ({rec['unit_type']})")
            print(f"   ETA: {rec['eta_minutes']:.1f} min")
            print(f"   Total Score: {rec['total_score']:.2f}")
            print(f"   Fatigue Score: {rec['fatigue_score']:.2f}")
            print(f"   Explanation: {rec['explanation']}")


if __name__ == "__main__":
    print("Running Unit Recommendation Intelligence Tests...\n")
    asyncio.run(test_911_scenario())
    asyncio.run(test_ift_scenario())
    asyncio.run(test_hems_scenario())
    print("\n✓ All acceptance tests completed")
