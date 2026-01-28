import { UUID } from '../types';
export interface VoiceCallParams {
    to: string;
    from: string;
    message: string;
    answeringMachineDetection?: boolean;
}
export interface SMSParams {
    to: string;
    from: string;
    message: string;
}
export interface CallResult {
    success: boolean;
    callId?: string;
    duration?: number;
    cost?: number;
    error?: string;
    timestamp: Date;
}
export interface SMSResult {
    success: boolean;
    messageId?: string;
    cost?: number;
    error?: string;
    timestamp: Date;
}
export interface CommunicationLog {
    id: UUID;
    type: 'VOICE' | 'SMS';
    incidentId?: UUID;
    unitId?: UUID;
    to: string;
    from: string;
    message: string;
    success: boolean;
    duration?: number;
    cost: number;
    telnyxId?: string;
    error?: string;
    createdAt: Date;
}
export declare class TelnyxService {
    private client;
    private apiKey;
    private voiceRatePerMinute;
    private smsRate;
    constructor(apiKey: string, voiceRatePerMinute?: number, smsRate?: number);
    /**
     * Send a voice call
     */
    sendVoiceCall(params: VoiceCallParams): Promise<CallResult>;
    /**
     * Send an SMS message
     */
    sendSMS(params: SMSParams): Promise<SMSResult>;
    /**
     * Send crew notification via voice call
     */
    notifyCrewByVoice(phoneNumber: string, incidentNumber: string, message: string, fromNumber: string): Promise<CallResult>;
    /**
     * Send crew notification via SMS
     */
    notifyCrewBySMS(phoneNumber: string, incidentNumber: string, message: string, fromNumber: string): Promise<SMSResult>;
    /**
     * Send facility notification
     */
    notifyFacility(phoneNumber: string, facilityName: string, eta: string, patientName: string, fromNumber: string, method?: 'VOICE' | 'SMS'): Promise<CallResult | SMSResult>;
    /**
     * Calculate call cost based on duration
     */
    calculateVoiceCost(durationMinutes: number): number;
    /**
     * Calculate SMS cost
     */
    calculateSMSCost(messageCount?: number): number;
    /**
     * Track communication cost for billing
     */
    trackCommunication(log: Omit<CommunicationLog, 'id' | 'createdAt'>): Promise<CommunicationLog>;
    /**
     * Mock voice call for testing (when no API key)
     */
    private mockVoiceCall;
    /**
     * Mock SMS for testing (when no API key)
     */
    private mockSMS;
    /**
     * Handle Telnyx voice webhook
     */
    handleVoiceWebhook(payload: any): Promise<void>;
    /**
     * Handle Telnyx SMS webhook
     */
    handleSMSWebhook(payload: any): Promise<void>;
    /**
     * Get communication costs for an incident
     */
    getIncidentCommunicationCosts(incidentId: UUID): Promise<{
        voiceMinutes: number;
        voiceCost: number;
        smsCount: number;
        smsCost: number;
        totalCost: number;
    }>;
    /**
     * Format phone number for Telnyx (E.164 format)
     */
    formatPhoneNumber(phone: string): string;
    /**
     * Validate phone number
     */
    validatePhoneNumber(phone: string): boolean;
    /**
     * Generate UUID helper
     */
    private generateUUID;
    /**
     * Batch send notifications to multiple recipients
     */
    sendBatchSMS(recipients: string[], message: string, fromNumber: string): Promise<SMSResult[]>;
    /**
     * Get service health status
     */
    getHealthStatus(): Promise<{
        available: boolean;
        apiKeyConfigured: boolean;
        error?: string;
    }>;
}
//# sourceMappingURL=TelnyxService.d.ts.map