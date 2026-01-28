"""
Socket Bridge Tests
Test suite for Socket.io bridge functionality.
"""
import pytest
from unittest.mock import AsyncMock, Mock, patch
from services.cad.socket_bridge import SocketBridge, get_socket_bridge


@pytest.fixture
def mock_socketio():
    """Mock socketio.AsyncClient"""
    with patch('services.cad.socket_bridge.socketio.AsyncClient') as mock:
        client = AsyncMock()
        mock.return_value = client
        yield client


@pytest.fixture
async def bridge(mock_socketio):
    """Create a socket bridge instance for testing"""
    bridge = SocketBridge()
    await bridge.initialize()
    return bridge


@pytest.mark.asyncio
async def test_bridge_initialization(bridge, mock_socketio):
    """Test that bridge initializes correctly"""
    assert bridge.sio is not None
    assert bridge.connected is False
    assert bridge.connection_attempts == 0


@pytest.mark.asyncio
async def test_bridge_connection(bridge, mock_socketio):
    """Test successful connection to CAD backend"""
    mock_socketio.connect = AsyncMock()
    
    await bridge.connect()
    
    mock_socketio.connect.assert_called_once()
    assert 'http://localhost:3000' in str(mock_socketio.connect.call_args)


@pytest.mark.asyncio
async def test_bridge_disconnect(bridge, mock_socketio):
    """Test disconnection from CAD backend"""
    bridge.connected = True
    mock_socketio.disconnect = AsyncMock()
    
    await bridge.disconnect()
    
    mock_socketio.disconnect.assert_called_once()
    assert bridge.connected is False


@pytest.mark.asyncio
async def test_send_assignment(bridge, mock_socketio):
    """Test sending assignment to CAD backend"""
    bridge.connected = True
    mock_socketio.emit = AsyncMock()
    
    incident_data = {
        "incidentId": "TEST-001",
        "type": "Cardiac Arrest",
        "address": "123 Test St"
    }
    
    success = await bridge.send_assignment("UNIT-1", incident_data)
    
    assert success is True
    mock_socketio.emit.assert_called_once()
    call_args = mock_socketio.emit.call_args
    assert call_args[0][0] == 'assignment:sent'
    assert call_args[0][1]['unitId'] == 'UNIT-1'


@pytest.mark.asyncio
async def test_update_unit_location(bridge, mock_socketio):
    """Test updating unit GPS location"""
    bridge.connected = True
    mock_socketio.emit = AsyncMock()
    
    location = {"type": "Point", "coordinates": [-122.4194, 37.7749]}
    
    success = await bridge.update_unit_location(
        "UNIT-1", location, heading=45.0, speed=65.0
    )
    
    assert success is True
    mock_socketio.emit.assert_called_once()
    call_args = mock_socketio.emit.call_args
    assert call_args[0][0] == 'unit:location'
    assert call_args[0][1]['unitId'] == 'UNIT-1'
    assert call_args[0][1]['heading'] == 45.0


@pytest.mark.asyncio
async def test_update_unit_status(bridge, mock_socketio):
    """Test updating unit status"""
    bridge.connected = True
    mock_socketio.emit = AsyncMock()
    
    success = await bridge.update_unit_status(
        "UNIT-1", "onscene", "INC-001"
    )
    
    assert success is True
    mock_socketio.emit.assert_called_once()
    call_args = mock_socketio.emit.call_args
    assert call_args[0][0] == 'unit:status'
    assert call_args[0][1]['status'] == 'onscene'


@pytest.mark.asyncio
async def test_emit_when_disconnected(bridge, mock_socketio):
    """Test that emit fails gracefully when disconnected"""
    bridge.connected = False
    
    success = await bridge.emit('test:event', {'data': 'test'})
    
    assert success is False


@pytest.mark.asyncio
async def test_event_handler_registration(bridge):
    """Test registering event handlers"""
    handler_called = False
    
    async def test_handler(data):
        nonlocal handler_called
        handler_called = True
    
    bridge.on('test:event', test_handler)
    
    assert 'test:event' in bridge.event_handlers
    assert test_handler in bridge.event_handlers['test:event']
    
    # Dispatch event
    await bridge._dispatch_event('test:event', {})
    
    assert handler_called is True


@pytest.mark.asyncio
async def test_event_handler_removal(bridge):
    """Test removing event handlers"""
    async def test_handler(data):
        pass
    
    bridge.on('test:event', test_handler)
    assert 'test:event' in bridge.event_handlers
    
    bridge.off('test:event', test_handler)
    assert test_handler not in bridge.event_handlers.get('test:event', [])


@pytest.mark.asyncio
async def test_health_status(bridge):
    """Test health status reporting"""
    health = bridge.get_health_status()
    
    assert 'connected' in health
    assert 'cad_url' in health
    assert 'connection_attempts' in health
    assert 'event_handlers_registered' in health
    
    assert health['connected'] is False
    assert health['connection_attempts'] == 0


@pytest.mark.asyncio
async def test_notify_transport_completed(bridge, mock_socketio):
    """Test transport completion notification"""
    bridge.connected = True
    mock_socketio.emit = AsyncMock()
    
    billing_data = {
        "patient_name": "Test Patient",
        "transport_type": "ALS-1",
        "mileage": 5.5
    }
    
    success = await bridge.notify_transport_completed(
        "INC-001", "EPCR-001", billing_data
    )
    
    assert success is True
    mock_socketio.emit.assert_called_once()
    call_args = mock_socketio.emit.call_args
    assert call_args[0][0] == 'transport:completed'
    assert call_args[0][1]['incidentId'] == 'INC-001'
    assert call_args[0][1]['epcrId'] == 'EPCR-001'


@pytest.mark.asyncio
async def test_broadcast_metrics(bridge, mock_socketio):
    """Test metrics broadcasting"""
    bridge.connected = True
    mock_socketio.emit = AsyncMock()
    
    metrics = {
        "active_incidents": 10,
        "available_units": 5,
        "revenue_today": 50000.00
    }
    
    success = await bridge.broadcast_metrics_update(metrics)
    
    assert success is True
    mock_socketio.emit.assert_called_once()
    call_args = mock_socketio.emit.call_args
    assert call_args[0][0] == 'metrics:updated'
    assert call_args[0][1]['metrics'] == metrics


@pytest.mark.asyncio
async def test_record_incident_timestamp(bridge, mock_socketio):
    """Test recording incident timestamps"""
    bridge.connected = True
    mock_socketio.emit = AsyncMock()
    
    location = {"type": "Point", "coordinates": [-122.4194, 37.7749]}
    
    success = await bridge.record_incident_timestamp(
        "INC-001", "onscene_at", "2024-01-27T10:00:00Z",
        location=location, source="auto"
    )
    
    assert success is True
    mock_socketio.emit.assert_called_once()
    call_args = mock_socketio.emit.call_args
    assert call_args[0][0] == 'incident:timestamp'
    assert call_args[0][1]['field'] == 'onscene_at'


@pytest.mark.asyncio
async def test_multiple_event_handlers(bridge):
    """Test multiple handlers for same event"""
    call_count = 0
    
    async def handler1(data):
        nonlocal call_count
        call_count += 1
    
    async def handler2(data):
        nonlocal call_count
        call_count += 1
    
    bridge.on('test:event', handler1)
    bridge.on('test:event', handler2)
    
    await bridge._dispatch_event('test:event', {})
    
    assert call_count == 2


@pytest.mark.asyncio
async def test_error_handling_in_event_dispatch(bridge):
    """Test that errors in one handler don't break others"""
    call_count = 0
    
    async def failing_handler(data):
        raise Exception("Handler error")
    
    async def working_handler(data):
        nonlocal call_count
        call_count += 1
    
    bridge.on('test:event', failing_handler)
    bridge.on('test:event', working_handler)
    
    # Should not raise exception
    await bridge._dispatch_event('test:event', {})
    
    # Working handler should still execute
    assert call_count == 1


def test_get_socket_bridge_singleton():
    """Test that get_socket_bridge returns singleton"""
    bridge1 = get_socket_bridge()
    bridge2 = get_socket_bridge()
    
    assert bridge1 is bridge2


@pytest.mark.asyncio
async def test_join_leave_rooms(bridge, mock_socketio):
    """Test joining and leaving Socket.io rooms"""
    bridge.connected = True
    mock_socketio.emit = AsyncMock()
    
    # Join unit room
    await bridge.join_room('unit:UNIT-1')
    mock_socketio.emit.assert_called_with('join:unit', 'UNIT-1')
    
    # Join incident room
    await bridge.join_room('incident:INC-001')
    mock_socketio.emit.assert_called_with('join:incident', 'INC-001')
    
    # Leave unit room
    await bridge.leave_room('unit:UNIT-1')
    mock_socketio.emit.assert_called_with('leave:unit', 'UNIT-1')


@pytest.mark.asyncio
async def test_connection_error_handling(bridge, mock_socketio):
    """Test handling of connection errors"""
    mock_socketio.connect = AsyncMock(side_effect=Exception("Connection failed"))
    
    with pytest.raises(Exception):
        await bridge.connect()
    
    assert bridge.last_error == "Connection failed"
