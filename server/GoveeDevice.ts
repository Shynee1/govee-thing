// Base abstract class for all Govee devices
export abstract class GoveeDevice {
    protected name: string;
    protected id: string;
    protected connected: boolean;

    public constructor(name: string, id: string) {
        this.name = name;
        this.id = id;
        this.connected = false;
    }

    // Abstract methods that must be implemented by subclasses
    public abstract connect(): Promise<boolean>;
    public abstract disconnect(): Promise<void>;
    public abstract setPower(on: boolean): Promise<boolean>;
    public abstract setBrightness(brightness: number): Promise<boolean>;
    public abstract setColor(r: number, g: number, b: number): Promise<boolean>;
    public abstract setColorTemperature(kelvin: number): Promise<boolean>;
    public abstract keepAlive(): Promise<boolean>;

    public isConnected(): boolean {
        return this.connected;
    }

    public getName(): string {
        return this.name;
    }

    public getId(): string {
        return this.id;
    }
}