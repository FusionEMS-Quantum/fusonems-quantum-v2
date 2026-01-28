import asyncio
from datetime import datetime
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
import json


class SchedulingWebSocketManager:
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        self.user_connections: Dict[int, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, org_id: int, user_id: int):
        await websocket.accept()
        if org_id not in self.active_connections:
            self.active_connections[org_id] = set()
        self.active_connections[org_id].add(websocket)
        self.user_connections[user_id] = websocket
    
    def disconnect(self, websocket: WebSocket, org_id: int, user_id: int):
        if org_id in self.active_connections:
            self.active_connections[org_id].discard(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]
    
    async def broadcast_to_org(self, org_id: int, message: dict):
        if org_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[org_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.add(connection)
            for conn in disconnected:
                self.active_connections[org_id].discard(conn)
    
    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_json(message)
            except Exception:
                del self.user_connections[user_id]
    
    async def notify_shift_created(self, org_id: int, shift_data: dict):
        await self.broadcast_to_org(org_id, {
            "type": "shift_created",
            "timestamp": datetime.utcnow().isoformat(),
            "data": shift_data
        })
    
    async def notify_shift_updated(self, org_id: int, shift_data: dict):
        await self.broadcast_to_org(org_id, {
            "type": "shift_updated",
            "timestamp": datetime.utcnow().isoformat(),
            "data": shift_data
        })
    
    async def notify_shift_deleted(self, org_id: int, shift_id: int):
        await self.broadcast_to_org(org_id, {
            "type": "shift_deleted",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"shift_id": shift_id}
        })
    
    async def notify_assignment_created(self, org_id: int, user_id: int, assignment_data: dict):
        await self.broadcast_to_org(org_id, {
            "type": "assignment_created",
            "timestamp": datetime.utcnow().isoformat(),
            "data": assignment_data
        })
        await self.send_to_user(user_id, {
            "type": "you_were_assigned",
            "timestamp": datetime.utcnow().isoformat(),
            "data": assignment_data
        })
    
    async def notify_assignment_removed(self, org_id: int, user_id: int, assignment_id: int):
        await self.broadcast_to_org(org_id, {
            "type": "assignment_removed",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"assignment_id": assignment_id}
        })
        await self.send_to_user(user_id, {
            "type": "your_assignment_removed",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"assignment_id": assignment_id}
        })
    
    async def notify_schedule_published(self, org_id: int, period_data: dict):
        await self.broadcast_to_org(org_id, {
            "type": "schedule_published",
            "timestamp": datetime.utcnow().isoformat(),
            "data": period_data
        })
    
    async def notify_time_off_status(self, user_id: int, request_data: dict):
        await self.send_to_user(user_id, {
            "type": "time_off_status_changed",
            "timestamp": datetime.utcnow().isoformat(),
            "data": request_data
        })
    
    async def notify_swap_request(self, target_user_id: int, swap_data: dict):
        await self.send_to_user(target_user_id, {
            "type": "swap_request_received",
            "timestamp": datetime.utcnow().isoformat(),
            "data": swap_data
        })
    
    async def notify_alert(self, org_id: int, alert_data: dict):
        await self.broadcast_to_org(org_id, {
            "type": "scheduling_alert",
            "timestamp": datetime.utcnow().isoformat(),
            "data": alert_data
        })


scheduling_ws_manager = SchedulingWebSocketManager()


def get_scheduling_ws_manager() -> SchedulingWebSocketManager:
    return scheduling_ws_manager
