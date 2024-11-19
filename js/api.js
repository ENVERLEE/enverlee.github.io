class API {
    constructor(baseUrl = 'localhost:8000/api/v1') {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (response.status === 401) {
                this.clearToken();
                window.location.reload();
                throw new Error('Unauthorized');
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth endpoints
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(credentials) {
        const formData = new URLSearchParams(credentials);
        return this.request('/auth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });
    }

    // Project endpoints
    async getProjects() {
        return this.request('/projects');
    }

    async createProject(projectData) {
        return this.request('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    }

    async getProject(projectId) {
        return this.request(`/projects/${projectId}`);
    }

    async updateProject(projectId, projectData) {
        return this.request(`/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify(projectData)
        });
    }

    async deleteProject(projectId) {
        return this.request(`/projects/${projectId}`, {
            method: 'DELETE'
        });
    }

    // Step endpoints
    async getProjectSteps(projectId) {
        return this.request(`/projects/${projectId}/steps`);
    }

    async getStepDetails(projectId, stepNumber) {
        return this.request(`/projects/${projectId}/steps/${stepNumber}`);
    }

    async updateStep(projectId, stepNumber, stepData) {
        return this.request(`/projects/${projectId}/steps/${stepNumber}`, {
            method: 'PUT',
            body: JSON.stringify(stepData)
        });
    }

    async executeStep(projectId, stepNumber) {
        return this.request(`/projects/${projectId}/steps/${stepNumber}/execute`, {
            method: 'POST'
        });
    }

    async resetSteps(projectId) {
        return this.request(`/projects/${projectId}/steps/reset`, {
            method: 'POST'
        });
    }

    // Research execution endpoints
    async startResearch(projectId) {
        return this.request(`/projects/${projectId}/execute`, {
            method: 'POST'
        });
    }

    async getResearchStatus(projectId) {
        return this.request(`/projects/${projectId}/status`);
    }

    // Export endpoints
    async exportResults(projectId) {
        return this.request(`/projects/${projectId}/export`);
    }

    async exportDocx(projectId) {
        const response = await fetch(`${this.baseUrl}/projects/${projectId}/export/docx`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `project-${projectId}-export.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // Reference endpoints
    async searchReferences(searchData) {
        return this.request('/references/search', {
            method: 'POST',
            body: JSON.stringify(searchData)
        });
    }
}

// Export API instance
const api = new API();
