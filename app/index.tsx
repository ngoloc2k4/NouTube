import { View, Text, BackHandler, ColorSchemeName, ToastAndroid } from 'react-native'
import { useCallback, useEffect, useState } from 'react'
import { use$, useObserve, useObserveEffect } from '@legendapp/state/react'
import { ui$ } from '@/states/ui'
import { fixPageTitle, fixSharingUrl, getPageType, getVideoId, openSharedUrl } from '@/lib/page'
import { Asset } from 'expo-asset'
import { settings$ } from '@/states/settings'
import { useShareIntent } from 'expo-share-intent'
import * as Linking from 'expo-linking'
import { queue$ } from '@/states/queue'
import { EmbedVideoModal } from '@/components/modal/EmbedVideoModal'
import { MainPage } from '@/components/page/MainPage'
import { nIf } from '@/lib/utils'
import * as SplashScreen from 'expo-splash-screen'

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors if splash screen is already hidden
})

// Timeout duration for script loading (30 seconds)
const SCRIPT_LOAD_TIMEOUT_MS = 30000

export default function HomeScreen() {
  const [scriptOnStart, setScriptOnStart] = useState('')
  const [scriptError, setScriptError] = useState(false)
  const { hasShareIntent, shareIntent } = useShareIntent()

  useEffect(() => {
    const url = shareIntent.webUrl || shareIntent.text
    if (hasShareIntent && url) {
      openSharedUrl(url)
    }
  }, [hasShareIntent, shareIntent])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined

    ;(async () => {
      try {
        // Set a timeout to prevent indefinite loading
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Script loading timeout')), SCRIPT_LOAD_TIMEOUT_MS)
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
      } catch (error) {
        console.error('[NouTube] Failed to load script:', error)
        setScriptError(true)
        // Even on error, we should hide splash screen to show error message
      } finally {
        clearTimeout(timeoutId)
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
      if (timeoutId) {
        clearTimeout(timeoutId)
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
