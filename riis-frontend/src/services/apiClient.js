import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    const rawToken = localStorage.getItem('token')
    const token = rawToken ? rawToken.replace(/^Bearer\s+/i, '').trim() : ''
    console.log('Attached Token:', token)

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

export { apiClient }
export default apiClient
