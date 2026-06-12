import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

type Primitive = string | number | boolean | null | undefined

type QueryUpdates = Record<string, Primitive>

type UpdateOptions = {
  replace?: boolean
}

export function useWorkspaceSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const updateSearchParams = useCallback((updates: QueryUpdates, options: UpdateOptions = {}) => {
    const nextParams = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        nextParams.delete(key)
        return
      }

      nextParams.set(key, String(value))
    })

    setSearchParams(nextParams, { replace: options.replace ?? true })
  }, [searchParams, setSearchParams])

  return {
    searchParams,
    setSearchParams: updateSearchParams,
  }
}
