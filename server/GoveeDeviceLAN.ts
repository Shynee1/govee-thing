import { GoveeDevice } from "./GoveeDevice";
import * as dgram from "dgram";

const MULTICAST_ADDRESS = "239.255.255.250";
const SCAN_PORT = 4001;
const LISTEN_PORT = 4002;
const CONTROL_PORT = 4003;

interface GoveeLANDeviceInfo {
    ip: string;
    device: string;
    sku: string;
    bleVersionHard: string;
    bleVersionSoft: string;
    wifiVersionHard: string;
    wifiVersionSoft: string;
}

export class GoveeDeviceLAN extends GoveeDevice {
    private ip: string;
    private sku: string;
    private deviceInfo: GoveeLANDeviceInfo;
    private socket: dgram.Socket | null = null;

    public constructor(deviceInfo: GoveeLANDeviceInfo) {
        super(deviceInfo.sku, deviceInfo.device);
        this.ip = deviceInfo.ip;
        this.sku = deviceInfo.sku;
        this.deviceInfo = deviceInfo;
        console.log(`LAN Device created: ${this.sku} at ${this.ip}`);
    }

    private sendCommand(cmd: string, data: any): Promise<boolean> {
        return new Promise((resolve) => {
            if (!this.socket) {
                console.log(`Socket not initialized for device ${this.name}`);
                resolve(false);
                return;
            }

            const message = JSON.stringify({
                msg: {
                    cmd: cmd,
                    data: data
                }
            });

            const buffer = Buffer.from(message);

            this.socket.send(buffer, CONTROL_PORT, this.ip, (err) => {
                if (err) {
                    console.log(`Error sending command to ${this.name}: ${err}`);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    public async connect(): Promise<boolean> {
        if (this.connected) {
            console.log(`Device ${this.name} is already connected.`);
            return true;
        }

        try {
            this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
            
            await new Promise<void>((resolve, reject) => {
                this.socket!.on('error', (err) => {
                    console.log(`Socket error for ${this.name}: ${err}`);
                    reject(err);
                });

                this.socket!.bind(() => {
                    console.log(`Socket bound for device ${this.name}`);
                    resolve();
                });
            });

            this.connected = true;
            return true;
        } catch (error) {
            console.log(`Failed to connect to device ${this.name}: ${error}`);
            this.connected = false;
            return false;
        }
    }

    public async disconnect(): Promise<void> {
        if (!this.connected) return;

        console.log(`Disconnecting LAN device ${this.name}...`);

        try {
            await this.setPower(false);
        } catch (error) {
            console.log(`Could not power off device ${this.name} before disconnect:`, error);
        }

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.connected = false;
    }

    public async keepAlive(): Promise<boolean> {
        // Query device status to keep connection alive
        return await this.sendCommand("devStatus", {});
    }

    public async setPower(on: boolean): Promise<boolean> {
        return await this.sendCommand("turn", {
            value: on ? 1 : 0
        });
    }

    public async setBrightness(brightness: number): Promise<boolean> {
        const clampedBrightness = Math.max(1, Math.min(100, brightness));
        return await this.sendCommand("brightness", {
            value: clampedBrightness
        });
    }

    public async setColor(r: number, g: number, b: number): Promise<boolean> {
        // Set colorTemInKelvin to 0 to use RGB values
        return await this.sendCommand("colorwc", {
            color: {
                r: r,
                g: g,
                b: b
            },
            colorTemInKelvin: 0
        });
    }

    public async setColorTemperature(kelvin: number): Promise<boolean> {
        const clampedKelvin = Math.max(2000, Math.min(9000, kelvin));
        return await this.sendCommand("colorwc", {
            color: {
                r: 0,
                g: 0,
                b: 0
            },
            colorTemInKelvin: clampedKelvin
        });
    }

    public getIp(): string {
        return this.ip;
    }

    public getSku(): string {
        return this.sku;
    }

    public static async scanForDevices(timeout: number = 5000): Promise<GoveeLANDeviceInfo[]> {
        return new Promise((resolve) => {
            const devices: GoveeLANDeviceInfo[] = [];
            const discoveredIds = new Set<string>();

            const scanSocket = dgram.createSocket({ type: "udp4", reuseAddr: true });
            const listenSocket = dgram.createSocket({ type: "udp4", reuseAddr: true });

            let timeoutHandle: NodeJS.Timeout;

            const cleanup = () => {
                clearTimeout(timeoutHandle);
                try {
                    scanSocket.close();
                } catch (e) { /* ignore */ }
                try {
                    listenSocket.close();
                } catch (e) { /* ignore */ }
            };

            listenSocket.on('message', (msg) => {
                try {
                    const response = JSON.parse(msg.toString());
                    if (response.msg && response.msg.cmd === 'scan' && response.msg.data) {
                        const deviceInfo: GoveeLANDeviceInfo = response.msg.data;
                        
                        // Avoid duplicates
                        if (!discoveredIds.has(deviceInfo.device)) {
                            discoveredIds.add(deviceInfo.device);
                            devices.push(deviceInfo);
                            console.log(`Discovered LAN device: ${deviceInfo.sku} at ${deviceInfo.ip}`);
                        }
                    }
                } catch (error) {
                    console.log(`Error parsing scan response: ${error}`);
                }
            });

            listenSocket.on('error', (err) => {
                console.log(`Listen socket error: ${err}`);
                cleanup();
                resolve(devices);
            });

            listenSocket.bind(LISTEN_PORT, () => {
                console.log(`Listening for LAN devices on port ${LISTEN_PORT}...`);

                scanSocket.bind(() => {
                    scanSocket.setBroadcast(true);
                    
                    const scanMessage = JSON.stringify({
                        msg: {
                            cmd: "scan",
                            data: {
                                account_topic: "reserve"
                            }
                        }
                    });

                    const scanBuffer = Buffer.from(scanMessage);

                    // Send scan request to multicast address
                    scanSocket.send(scanBuffer, SCAN_PORT, MULTICAST_ADDRESS, (err) => {
                        if (err) {
                            console.log(`Error sending scan request: ${err}`);
                            cleanup();
                            resolve(devices);
                        } else {
                            console.log(`Scan request sent to ${MULTICAST_ADDRESS}:${SCAN_PORT}`);
                        }
                    });

                    // Set timeout to stop scanning
                    timeoutHandle = setTimeout(() => {
                        console.log(`LAN scan completed. Found ${devices.length} device(s).`);
                        cleanup();
                        resolve(devices);
                    }, timeout);
                });
            });
        });
    }
}
