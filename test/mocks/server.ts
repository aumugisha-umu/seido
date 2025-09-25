import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Configure the Mock Service Worker server
export const server = setupServer(...handlers)