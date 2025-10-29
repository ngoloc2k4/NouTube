import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - reduced for better memory management on low-end devices
      gcTime: 5 * 60 * 1000, // 5 minutes - garbage collection time for unused queries
    },
  },
})
