const API_BASE = 'http://localhost:3001/api';

export default {
  // Current state
  async getCurrentState() {
    const response = await axios.get(`${API_BASE}/state`);
    return response.data;
  },
  
  // Historical data
  async getHistory() {
    const response = await axios.get(`${API_BASE}/history`);
    return response.data;
  },
  
  // Actions
  async simulateWatering() {
    const response = await axios.post(`${API_BASE}/water`);
    return response.data;
  },
  
  async changeLightConditions() {
    const response = await axios.post(`${API_BASE}/light`);
    return response.data;
  }
};