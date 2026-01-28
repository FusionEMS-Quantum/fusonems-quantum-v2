import { getToken, updateToken } from './auth';
import { enqueueOfflineItem } from './offline-queue';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class APIClient {
  private async getHeaders(): Promise<HeadersInit> {
    await updateToken();
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = await this.getHeaders();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (!navigator.onLine) {
        // Queue for later if offline
        if (options.method !== 'GET') {
          await enqueueOfflineItem({
            type: 'event',
            payload: { endpoint, options },
          });
        }
      }
      throw error;
    }
  }

  // Incident endpoints
  async createIncident(data: any) {
    return this.request('/api/fire/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getIncident(id: string) {
    return this.request(`/api/fire/incidents/${id}`);
  }

  async getIncidentHistory(unitId: string) {
    return this.request(`/api/fire/incidents?unit_id=${unitId}`);
  }

  // Event endpoints
  async createEvent(data: any) {
    return this.request('/api/fire/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEvents(incidentId: string) {
    return this.request(`/api/fire/events?incident_id=${incidentId}`);
  }

  // GPS endpoints
  async sendBreadcrumb(data: any) {
    return this.request('/api/fire/gps/breadcrumb', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Config endpoints
  async getConfig(unitId: string) {
    return this.request(`/api/fire/config/${unitId}`);
  }

  async updateConfig(unitId: string, data: any) {
    return this.request(`/api/fire/config/${unitId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const api = new APIClient();
