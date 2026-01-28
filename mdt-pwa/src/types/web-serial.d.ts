// Web Serial API types
declare global {
  interface Navigator {
    serial: Serial
  }

  interface Serial extends EventTarget {
    getPorts(): Promise<SerialPort[]>
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>
    addEventListener(
      type: 'connect' | 'disconnect',
      listener: (this: this, ev: Event) => any,
      useCapture?: boolean
    ): void
  }

  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[]
  }

  interface SerialPortFilter {
    usbVendorId?: number
    usbProductId?: number
  }

  interface SerialPort extends EventTarget {
    readonly readable: ReadableStream
    readonly writable: WritableStream
    open(options: SerialOptions): Promise<void>
    close(): Promise<void>
    getInfo(): SerialPortInfo
  }

  interface SerialOptions {
    baudRate: number
    dataBits?: number
    stopBits?: number
    parity?: 'none' | 'even' | 'odd'
    bufferSize?: number
    flowControl?: 'none' | 'hardware'
  }

  interface SerialPortInfo {
    usbVendorId?: number
    usbProductId?: number
  }
}

export {}
