/**
 * OBD-II Service using ELM327 Protocol
 * Supports both USB (Web Serial API) and Bluetooth (Web Bluetooth API)
 */

/// <reference path="../types/web-serial.d.ts" />

export interface OBDData {
  connected: boolean
  vehicleSpeed: number // km/h
  engineRPM: number
  fuelLevel: number // percent
  odometer: number // km
  batteryVoltage: number
  checkEngine: boolean
  vin: string
  lastUpdate: Date
}

export interface OBDDevice {
  type: 'serial' | 'bluetooth'
  name: string
  connected: boolean
}

export class OBDService {
  private port: any = null
  private bluetoothDevice: any = null
  private bluetoothCharacteristic: any = null
  private reader: ReadableStreamDefaultReader<string> | null = null
  private writer: WritableStreamDefaultWriter<string> | null = null
  private deviceType: 'serial' | 'bluetooth' | null = null
  private isInitialized = false
  
  private data: OBDData = {
    connected: false,
    vehicleSpeed: 0,
    engineRPM: 0,
    fuelLevel: 0,
    odometer: 0,
    batteryVoltage: 0,
    checkEngine: false,
    vin: '',
    lastUpdate: new Date(),
  }

  /**
   * Auto-discover OBD devices (checks both Serial and Bluetooth)
   */
  async discoverDevices(): Promise<OBDDevice[]> {
    const devices: OBDDevice[] = []

    // Check Web Serial API (USB adapters)
    if ('serial' in navigator) {
      try {
        const ports = await (navigator as any).serial.getPorts()
        for (const _port of ports) {
          devices.push({
            type: 'serial',
            name: 'OBD-II USB Adapter',
            connected: false,
          })
        }
      } catch (error) {
        console.log('Serial API not available or no permission')
      }
    }

    // Check Web Bluetooth API (Bluetooth adapters)
    if ('bluetooth' in navigator) {
      try {
        const device = await (navigator as any).bluetooth.getDevices()
        if (device && device.length > 0) {
          devices.push({
            type: 'bluetooth',
            name: 'OBD-II Bluetooth Adapter',
            connected: false,
          })
        }
      } catch (error) {
        console.log('Bluetooth API not available')
      }
    }

    return devices
  }

  /**
   * Request user permission and connect to OBD device
   */
  async requestDevice(): Promise<boolean> {
    // Try Serial first (more reliable for vehicle use)
    if ('serial' in navigator) {
      try {
        const port = await (navigator as any).serial.requestPort({
          filters: [
            { usbVendorId: 0x1a86 }, // Common ELM327 chip
            { usbVendorId: 0x0403 }, // FTDI chips
          ]
        })
        
        await this.connectSerial(port)
        return true
      } catch (error) {
        console.log('Serial connection failed, trying Bluetooth:', error)
      }
    }

    // Fallback to Bluetooth
    if ('bluetooth' in navigator) {
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [
            { services: ['0000fff0-0000-1000-8000-00805f9b34fb'] }, // Generic OBD service
            { namePrefix: 'OBD' },
            { namePrefix: 'ELM327' },
            { namePrefix: 'OBDII' },
          ],
          optionalServices: ['0000fff0-0000-1000-8000-00805f9b34fb']
        })
        
        await this.connectBluetooth(device)
        return true
      } catch (error) {
        console.error('Bluetooth connection failed:', error)
        return false
      }
    }

    return false
  }

  /**
   * Connect to Serial OBD adapter
   */
  private async connectSerial(portDevice: any) {
    this.port = portDevice
    this.deviceType = 'serial'
    
    await portDevice.open({ baudRate: 38400 }) // ELM327 default baud rate
    
    const textEncoder = new TextEncoderStream()
    textEncoder.readable.pipeTo(portDevice.writable as any)
    this.writer = textEncoder.writable.getWriter()
    
    const textDecoder = new TextDecoderStream()
    portDevice.readable.pipeTo(textDecoder.writable as any)
    this.reader = textDecoder.readable.getReader()
    
    await this.initialize()
    this.data.connected = true
    
    // Start monitoring
    this.startMonitoring()
  }

  /**
   * Connect to Bluetooth OBD adapter
   */
  private async connectBluetooth(device: any) {
    this.bluetoothDevice = device
    this.deviceType = 'bluetooth'
    
    const server = await device.gatt!.connect()
    const service = await server.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb')
    this.bluetoothCharacteristic = await service.getCharacteristic('0000fff2-0000-1000-8000-00805f9b34fb')
    
    // Set up notifications
    await this.bluetoothCharacteristic.startNotifications()
    this.bluetoothCharacteristic.addEventListener('characteristicvaluechanged', this.handleBluetoothData.bind(this))
    
    await this.initialize()
    this.data.connected = true
    
    // Start monitoring
    this.startMonitoring()
  }

  /**
   * Initialize ELM327 adapter
   */
  private async initialize() {
    if (this.isInitialized) return
    
    // Reset device
    await this.sendCommand('ATZ')
    await this.delay(1000)
    
    // Turn off echo
    await this.sendCommand('ATE0')
    
    // Set protocol to auto
    await this.sendCommand('ATSP0')
    
    // Get VIN
    const vin = await this.sendCommand('0902')
    if (vin && vin.length > 10) {
      this.data.vin = this.parseVIN(vin)
    }
    
    this.isInitialized = true
  }

  /**
   * Send OBD-II command
   */
  private async sendCommand(command: string): Promise<string> {
    if (this.deviceType === 'serial' && this.writer) {
      await this.writer.write(command + '\r')
      return await this.readSerialResponse()
    } else if (this.deviceType === 'bluetooth' && this.bluetoothCharacteristic) {
      const encoder = new TextEncoder()
      await this.bluetoothCharacteristic.writeValue(encoder.encode(command + '\r'))
      // Bluetooth responses come via notification
      return ''
    }
    return ''
  }

  /**
   * Read response from Serial adapter
   */
  private async readSerialResponse(): Promise<string> {
    if (!this.reader) return ''
    
    let response = ''
    const timeout = setTimeout(() => {
      throw new Error('Read timeout')
    }, 2000)
    
    try {
      const { value, done } = await this.reader.read()
      clearTimeout(timeout)
      
      if (done) return ''
      response = value || ''
      
      // Wait for prompt '>'
      while (!response.includes('>')) {
        const { value: nextValue, done: nextDone } = await this.reader.read()
        if (nextDone) break
        response += nextValue || ''
      }
      
      return response.replace('>', '').trim()
    } catch (error) {
      clearTimeout(timeout)
      return ''
    }
  }

  /**
   * Handle Bluetooth characteristic data
   */
  private handleBluetoothData(event: Event) {
    const characteristic = event.target as any
    const value = characteristic.value
    if (value) {
      const decoder = new TextDecoder()
      decoder.decode(value)
      // Process response in real implementation
    }
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring() {
    // Query vehicle data every 2 seconds
    setInterval(async () => {
      if (!this.data.connected) return
      
      try {
        // Get speed (PID 010D)
        const speedResponse = await this.sendCommand('010D')
        this.data.vehicleSpeed = this.parseSpeed(speedResponse)
        
        // Get RPM (PID 010C)
        const rpmResponse = await this.sendCommand('010C')
        this.data.engineRPM = this.parseRPM(rpmResponse)
        
        // Get fuel level (PID 012F)
        const fuelResponse = await this.sendCommand('012F')
        this.data.fuelLevel = this.parseFuelLevel(fuelResponse)
        
        // Get battery voltage (PID 0142)
        const voltageResponse = await this.sendCommand('0142')
        this.data.batteryVoltage = this.parseBatteryVoltage(voltageResponse)
        
        // Get check engine status (PID 0101)
        const dtcResponse = await this.sendCommand('0101')
        this.data.checkEngine = this.parseCheckEngine(dtcResponse)
        
        // Get odometer every 30 seconds (Mode 01 PID A6 - not all vehicles support this)
        if (Date.now() % 30000 < 2000) {
          const odometerResponse = await this.sendCommand('01A6')
          const odometer = this.parseOdometer(odometerResponse)
          if (odometer > 0) {
            this.data.odometer = odometer
          }
        }
        
        this.data.lastUpdate = new Date()
        
        // Store in localStorage for persistence
        localStorage.setItem('obd_data', JSON.stringify(this.data))
        
        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('obd-update', { detail: this.data }))
        
        // Send to Fleet API every 30 seconds
        if (Date.now() % 30000 < 2000) {
          await this.syncToFleet()
        }
      } catch (error) {
        console.error('OBD monitoring error:', error)
      }
    }, 2000)
  }

  /**
   * Sync OBD data to Fleet API
   */
  private async syncToFleet() {
    try {
      // Get current GPS location if available
      let latitude: number | null = null
      let longitude: number | null = null
      
      if ('geolocation' in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        }).catch(() => null)
        
        if (position) {
          latitude = position.coords.latitude
          longitude = position.coords.longitude
        }
      }
      
      const unitId = localStorage.getItem('unit_id')
      
      const response = await fetch('/api/fleet/obd-telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          vin: this.data.vin,
          unit_id: unitId,
          odometer_km: this.data.odometer,
          speed_kmh: this.data.vehicleSpeed,
          engine_rpm: this.data.engineRPM,
          fuel_level_percent: this.data.fuelLevel,
          battery_voltage: this.data.batteryVoltage,
          check_engine: this.data.checkEngine,
          latitude,
          longitude,
        }),
      })
      
      if (!response.ok) {
        console.warn('Failed to sync OBD data to Fleet API')
      }
    } catch (error) {
      console.error('Fleet sync error:', error)
    }
  }

  /**
   * Parse responses
   */
  private parseSpeed(response: string): number {
    // Response format: "41 0D XX" where XX is speed in km/h
    const bytes = response.split(' ')
    if (bytes.length >= 3 && bytes[0] === '41' && bytes[1] === '0D') {
      return parseInt(bytes[2], 16)
    }
    return 0
  }

  private parseRPM(response: string): number {
    // Response format: "41 0C XX YY" where RPM = ((XX * 256) + YY) / 4
    const bytes = response.split(' ')
    if (bytes.length >= 4 && bytes[0] === '41' && bytes[1] === '0C') {
      const a = parseInt(bytes[2], 16)
      const b = parseInt(bytes[3], 16)
      return ((a * 256) + b) / 4
    }
    return 0
  }

  private parseFuelLevel(response: string): number {
    // Response format: "41 2F XX" where XX is fuel level percentage
    const bytes = response.split(' ')
    if (bytes.length >= 3 && bytes[0] === '41' && bytes[1] === '2F') {
      return (parseInt(bytes[2], 16) * 100) / 255
    }
    return 0
  }

  private parseBatteryVoltage(response: string): number {
    // Response format: "41 42 XX YY" where voltage = ((XX * 256) + YY) / 1000
    const bytes = response.split(' ')
    if (bytes.length >= 4 && bytes[0] === '41' && bytes[1] === '42') {
      const a = parseInt(bytes[2], 16)
      const b = parseInt(bytes[3], 16)
      return ((a * 256) + b) / 1000
    }
    return 0
  }

  private parseCheckEngine(response: string): boolean {
    // Response format: "41 01 XX ..." where bit 7 of XX indicates MIL (check engine)
    const bytes = response.split(' ')
    if (bytes.length >= 3 && bytes[0] === '41' && bytes[1] === '01') {
      const status = parseInt(bytes[2], 16)
      return (status & 0x80) !== 0
    }
    return false
  }

  private parseOdometer(response: string): number {
    // Response format: "41 A6 AA BB CC DD" where odometer = (AA*16777216 + BB*65536 + CC*256 + DD) / 10 km
    const bytes = response.split(' ')
    if (bytes.length >= 6 && bytes[0] === '41' && bytes[1] === 'A6') {
      const a = parseInt(bytes[2], 16)
      const b = parseInt(bytes[3], 16)
      const c = parseInt(bytes[4], 16)
      const d = parseInt(bytes[5], 16)
      return (a * 16777216 + b * 65536 + c * 256 + d) / 10
    }
    return 0
  }

  private parseVIN(response: string): string {
    // VIN is 17 characters, extract from response
    const cleaned = response.replace(/\s/g, '').replace(/[^A-Z0-9]/g, '')
    if (cleaned.length >= 17) {
      return cleaned.substring(0, 17)
    }
    return ''
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get current OBD data
   */
  getData(): OBDData {
    return { ...this.data }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.data.connected
  }

  /**
   * Disconnect from OBD adapter
   */
  async disconnect() {
    if (this.deviceType === 'serial' && this.port) {
      try {
        await this.reader?.cancel()
        await this.writer?.close()
        await this.port.close()
      } catch (error) {
        console.error('Error closing serial port:', error)
      }
    } else if (this.deviceType === 'bluetooth' && this.bluetoothDevice) {
      try {
        await this.bluetoothDevice.gatt?.disconnect()
      } catch (error) {
        console.error('Error disconnecting Bluetooth:', error)
      }
    }
    
    this.data.connected = false
    this.isInitialized = false
  }
}

export const obdService = new OBDService()
