"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelnyxService = void 0;
const telnyx_1 = __importDefault(require("telnyx"));
class TelnyxService {
    constructor(apiKey, voiceRatePerMinute = 0.0575, smsRate = 0.0075) {
        this.apiKey = apiKey;
        this.voiceRatePerMinute = voiceRatePerMinute;
        this.smsRate = smsRate;
        if (!apiKey) {
            console.warn('Telnyx API key not provided. Service will run in mock mode.');
        }
        // Initialize Telnyx client
        this.client = (0, telnyx_1.default)(apiKey);
    }
    /**
     * Send a voice call
     */
    async sendVoiceCall(params) {
        if (!this.apiKey) {
            return this.mockVoiceCall(params);
        }
        try {
            // Create a call using Telnyx API
            const call = await this.client.calls.create({
                connection_id: process.env.TELNYX_CONNECTION_ID || '',
                to: params.to,
                from: params.from,
                answering_machine_detection: params.answeringMachineDetection ? 'detect' : 'disabled',
                webhook_url: `${process.env.BASE_URL}/api/telnyx/webhooks/voice`,
                webhook_url_method: 'POST'
            });
            // In production, you'd use text-to-speech for the message
            // For now, we'll just track the call initiation
            const result = {
                success: true,
                callId: call.data.call_control_id,
                duration: 0, // Will be updated by webhook
                cost: 0, // Will be calculated after call completes
                timestamp: new Date()
            };
            return result;
        }
        catch (error) {
            console.error('Telnyx voice call error:', error);
            return {
                success: false,
                error: error.message || 'Failed to initiate call',
                timestamp: new Date()
            };
        }
    }
    /**
     * Send an SMS message
     */
    async sendSMS(params) {
        if (!this.apiKey) {
            return this.mockSMS(params);
        }
        try {
            const message = await this.client.messages.create({
                from: params.from,
                to: params.to,
                text: params.message,
                webhook_url: `${process.env.BASE_URL}/api/telnyx/webhooks/sms`,
                use_profile_webhooks: false
            });
            const result = {
                success: true,
                messageId: message.data.id,
                cost: this.smsRate,
                timestamp: new Date()
            };
            return result;
        }
        catch (error) {
            console.error('Telnyx SMS error:', error);
            return {
                success: false,
                error: error.message || 'Failed to send SMS',
                timestamp: new Date()
            };
        }
    }
    /**
     * Send crew notification via voice call
     */
    async notifyCrewByVoice(phoneNumber, incidentNumber, message, fromNumber) {
        const fullMessage = `Attention. New transport assignment. Incident number ${incidentNumber}. ${message}. Please acknowledge via your MDT or call dispatch.`;
        return await this.sendVoiceCall({
            to: phoneNumber,
            from: fromNumber,
            message: fullMessage,
            answeringMachineDetection: true
        });
    }
    /**
     * Send crew notification via SMS
     */
    async notifyCrewBySMS(phoneNumber, incidentNumber, message, fromNumber) {
        const fullMessage = `NEW TRANSPORT: Incident #${incidentNumber}. ${message}. Check your MDT for details.`;
        return await this.sendSMS({
            to: phoneNumber,
            from: fromNumber,
            message: fullMessage
        });
    }
    /**
     * Send facility notification
     */
    async notifyFacility(phoneNumber, facilityName, eta, patientName, fromNumber, method = 'SMS') {
        const message = method === 'SMS'
            ? `Transport ETA to ${facilityName}: ${eta}. Patient: ${patientName}. Please prepare for arrival.`
            : `Attention ${facilityName}. Transport inbound with estimated arrival ${eta}. Patient name ${patientName}. Please prepare for arrival.`;
        if (method === 'VOICE') {
            return await this.sendVoiceCall({
                to: phoneNumber,
                from: fromNumber,
                message
            });
        }
        else {
            return await this.sendSMS({
                to: phoneNumber,
                from: fromNumber,
                message
            });
        }
    }
    /**
     * Calculate call cost based on duration
     */
    calculateVoiceCost(durationMinutes) {
        return durationMinutes * this.voiceRatePerMinute;
    }
    /**
     * Calculate SMS cost
     */
    calculateSMSCost(messageCount = 1) {
        return messageCount * this.smsRate;
    }
    /**
     * Track communication cost for billing
     */
    async trackCommunication(log) {
        const fullLog = {
            ...log,
            id: this.generateUUID(),
            createdAt: new Date()
        };
        // In production, store this in database
        console.log('Communication tracked:', fullLog);
        return fullLog;
    }
    /**
     * Mock voice call for testing (when no API key)
     */
    mockVoiceCall(params) {
        console.log('[MOCK] Voice call:', params);
        // Simulate 2-minute call
        const duration = 2;
        const cost = this.calculateVoiceCost(duration);
        return {
            success: true,
            callId: `mock-call-${Date.now()}`,
            duration,
            cost,
            timestamp: new Date()
        };
    }
    /**
     * Mock SMS for testing (when no API key)
     */
    mockSMS(params) {
        console.log('[MOCK] SMS:', params);
        const cost = this.calculateSMSCost();
        return {
            success: true,
            messageId: `mock-sms-${Date.now()}`,
            cost,
            timestamp: new Date()
        };
    }
    /**
     * Handle Telnyx voice webhook
     */
    async handleVoiceWebhook(payload) {
        const { event_type, payload: data } = payload;
        switch (event_type) {
            case 'call.answered':
                console.log('Call answered:', data.call_control_id);
                // Speak the message using TTS
                await this.client.calls.speak({
                    call_control_id: data.call_control_id,
                    payload: data.message || 'This is a test call.',
                    voice: 'female',
                    language: 'en-US'
                });
                break;
            case 'call.hangup':
                console.log('Call ended:', data.call_control_id);
                // Calculate duration and cost
                const duration = data.call_duration || 0;
                const cost = this.calculateVoiceCost(duration / 60);
                console.log(`Call duration: ${duration}s, Cost: $${cost.toFixed(4)}`);
                break;
            case 'call.machine.detection.ended':
                if (data.result === 'human') {
                    console.log('Human detected on call');
                }
                else {
                    console.log('Answering machine detected');
                    // Optionally leave voicemail
                }
                break;
            default:
                console.log('Unhandled voice webhook event:', event_type);
        }
    }
    /**
     * Handle Telnyx SMS webhook
     */
    async handleSMSWebhook(payload) {
        const { event_type, payload: data } = payload;
        switch (event_type) {
            case 'message.sent':
                console.log('SMS sent:', data.id);
                break;
            case 'message.delivered':
                console.log('SMS delivered:', data.id);
                break;
            case 'message.failed':
                console.error('SMS failed:', data.id, data.errors);
                break;
            case 'message.received':
                console.log('SMS received from:', data.from, data.text);
                // Handle inbound SMS (crew acknowledgments, etc.)
                break;
            default:
                console.log('Unhandled SMS webhook event:', event_type);
        }
    }
    /**
     * Get communication costs for an incident
     */
    async getIncidentCommunicationCosts(incidentId) {
        // In production, query from database
        // For now, return mock data
        return {
            voiceMinutes: 0,
            voiceCost: 0,
            smsCount: 0,
            smsCost: 0,
            totalCost: 0
        };
    }
    /**
     * Format phone number for Telnyx (E.164 format)
     */
    formatPhoneNumber(phone) {
        // Remove all non-numeric characters
        const cleaned = phone.replace(/\D/g, '');
        // Add +1 for US numbers if not present
        if (cleaned.length === 10) {
            return `+1${cleaned}`;
        }
        else if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return `+${cleaned}`;
        }
        else if (cleaned.startsWith('+')) {
            return phone;
        }
        return `+${cleaned}`;
    }
    /**
     * Validate phone number
     */
    validatePhoneNumber(phone) {
        const formatted = this.formatPhoneNumber(phone);
        // E.164 format: + followed by country code and number (max 15 digits)
        return /^\+[1-9]\d{1,14}$/.test(formatted);
    }
    /**
     * Generate UUID helper
     */
    generateUUID() {
        const crypto = require('crypto');
        return crypto.randomUUID();
    }
    /**
     * Batch send notifications to multiple recipients
     */
    async sendBatchSMS(recipients, message, fromNumber) {
        const results = [];
        for (const recipient of recipients) {
            const result = await this.sendSMS({
                to: recipient,
                from: fromNumber,
                message
            });
            results.push(result);
            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return results;
    }
    /**
     * Get service health status
     */
    async getHealthStatus() {
        if (!this.apiKey) {
            return {
                available: false,
                apiKeyConfigured: false,
                error: 'Telnyx API key not configured'
            };
        }
        try {
            // Test API connectivity by listing available numbers
            await this.client.availablePhoneNumbers.list({
                filter: {
                    country_code: 'US',
                    limit: 1
                }
            });
            return {
                available: true,
                apiKeyConfigured: true
            };
        }
        catch (error) {
            return {
                available: false,
                apiKeyConfigured: true,
                error: error.message || 'Telnyx API error'
            };
        }
    }
}
exports.TelnyxService = TelnyxService;
//# sourceMappingURL=TelnyxService.js.map