import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

const PUBLIC_ROUTES = [
  '/search',
  '/institutions',
  '/auth/',
]

apiClient.interceptors.request.use(
  (config) => {
    const isPublic = PUBLIC_ROUTES.some(route => config.url?.startsWith(route))
    if (!isPublic) {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('DEBUG: Request failed with status:', error.response?.status)
    console.error('DEBUG: Full error details:', error)
    return Promise.reject(error)
  },
)

export { apiClient }
export default apiClient
