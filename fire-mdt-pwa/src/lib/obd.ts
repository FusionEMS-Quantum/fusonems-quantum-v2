import type { OBDData } from '../types';

// Mock OBD-II adapter - replace with actual ELM327 or OBDLink integration
export class OBDAdapter {
  private connected: boolean = false;
  private intervalId: number | null = null;

  async connect(): Promise<boolean> {
    // TODO: Implement actual OBD connection via Bluetooth or USB
    console.log('Connecting to OBD-II adapter...');
    this.connected = true;
    return true;
  }

  disconnect() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  startMonitoring(callback: (data: OBDData) => void, intervalMs: number = 1000) {
    if (!this.connected) {
      throw new Error('OBD adapter not connected');
    }

    this.intervalId = window.setInterval(async () => {
      const data = await this.readData();
      callback(data);
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async readData(): Promise<OBDData> {
    // TODO: Implement actual OBD-II PID reading
    // Common PIDs:
    // - 0x0C: Engine RPM
    // - 0x0D: Vehicle Speed
    // - 0x1F: Engine run time
    
    // Mock data for now
    return {
      ignition: true,
      gear: this.getRandomGear(),
      speed: Math.random() * 60,
      rpm: 1000 + Math.random() * 3000,
      timestamp: new Date(),
    };
  }

  private getRandomGear(): 'P' | 'R' | 'N' | 'D' | 'L' {
    const gears: Array<'P' | 'R' | 'N' | 'D' | 'L'> = ['P', 'R', 'N', 'D', 'L'];
    return gears[Math.floor(Math.random() * gears.length)];
  }
}

export const obdAdapter = new OBDAdapter();

export const interpretOBDForState = (
  data: OBDData
): { isMoving: boolean; isParked: boolean } => {
  const isMoving = data.gear === 'D' && data.speed > 5;
  const isParked = data.gear === 'P' && data.speed < 1;
  return { isMoving, isParked };
};
