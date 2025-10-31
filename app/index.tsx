import { View, Text, BackHandler, ActivityIndicator } from 'react-native'
import { useEffect, useState } from 'react'
import { useObserveEffect } from '@legendapp/state/react'
import { ui$ } from '@/states/ui'
import { openSharedUrl } from '@/lib/page'
import { Asset } from 'expo-asset'
import { useShareIntent } from 'expo-share-intent'
import * as Linking from 'expo-linking'
import { MainPage } from '@/components/page/MainPage'
import { nIf } from '@/lib/utils'
import * as SplashScreen from 'expo-splash-screen'

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors if splash screen is already hidden
})

// Timeout duration for script loading (5 seconds - reduced to prevent ANR)
const SCRIPT_LOAD_TIMEOUT_MS = 5000

// Maximum time to show splash screen (2 seconds - prevents ANR)
const SPLASH_SCREEN_TIMEOUT_MS = 2000

export default function HomeScreen() {
  const [scriptOnStart, setScriptOnStart] = useState('')
  const [scriptError, setScriptError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { hasShareIntent, shareIntent } = useShareIntent()

  useEffect(() => {
    const url = shareIntent.webUrl || shareIntent.text
    if (hasShareIntent && url) {
      openSharedUrl(url)
    }
  }, [hasShareIntent, shareIntent])

  useEffect(() => {
    let scriptTimeoutId: NodeJS.Timeout | undefined
    let splashTimeoutId: NodeJS.Timeout | undefined

    // Hide splash screen after maximum timeout to prevent ANR
    splashTimeoutId = setTimeout(async () => {
      await SplashScreen.hideAsync().catch(() => {
        // Ignore errors if splash screen is already hidden
      })
      console.log('[NouTube] Splash screen hidden after timeout')
    }, SPLASH_SCREEN_TIMEOUT_MS)

    ;(async () => {
      try {
        // Set a timeout to prevent indefinite loading
        const timeoutPromise = new Promise<never>((_, reject) => {
          scriptTimeoutId = setTimeout(() => reject(new Error('Script loading timeout')), SCRIPT_LOAD_TIMEOUT_MS)
        })

        const loadPromise = (async () => {
          const [{ localUri }] = await Asset.loadAsync(require('../assets/scripts/main.bjs'))
          if (localUri) {
            const res = await fetch(localUri)
            const content = await res.text()
            return content
          }
          throw new Error('Failed to load script asset')
        })()

        const content = await Promise.race([loadPromise, timeoutPromise])
        setScriptOnStart(content)
        console.log('[NouTube] Script loaded successfully')
      } catch (error) {
        console.error('[NouTube] Failed to load script:', error)
        setScriptError(true)
      } finally {
        setIsLoading(false)
        clearTimeout(scriptTimeoutId)
        clearTimeout(splashTimeoutId)
        // Hide splash screen once loading is complete (success or failure)
        await SplashScreen.hideAsync().catch(() => {
          // Ignore errors if splash screen is already hidden
        })
      }
    })()

    const subscription = BackHandler.addEventListener('hardwareBackPress', function () {
      return true
    })

    return () => {
      if (scriptTimeoutId) {
        clearTimeout(scriptTimeoutId)
      }
      if (splashTimeoutId) {
        clearTimeout(splashTimeoutId)
      }
      subscription.remove()
    }
  }, [])

  useEffect(() => {
    const subscription = Linking.addEventListener('url', (e) => {
      openSharedUrl(e.url)
    })
    return () => subscription.remove()
  }, [])

  useObserveEffect(ui$.url, () => {
    ui$.queueModalOpen.set(false)
  })

  // Show loading indicator while script is loading
  if (isLoading && !scriptError) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-900">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-white text-base mt-4">Loading NouTube...</Text>
      </View>
    )
  }

  // Show error message if script failed to load
  if (scriptError) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-900 px-8">
        <Text className="text-white text-xl font-bold mb-4">Failed to Load NouTube</Text>
        <Text className="text-zinc-400 text-center mb-6">
          The app script could not be loaded. Please ensure the app was built correctly.
        </Text>
        <Text className="text-zinc-500 text-sm text-center">
          Try reinstalling the app or contact support if the issue persists.
        </Text>
      </View>
    )
  }

  return nIf(scriptOnStart, <MainPage contentJs={scriptOnStart} />)
}
