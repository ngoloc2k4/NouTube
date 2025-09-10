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

export default function HomeScreen() {
  const [scriptOnStart, setScriptOnStart] = useState('')
  const { hasShareIntent, shareIntent } = useShareIntent()

  useEffect(() => {
    const url = shareIntent.webUrl || shareIntent.text
    if (hasShareIntent && url) {
      openSharedUrl(url)
    }
  }, [hasShareIntent, shareIntent])

  useEffect(() => {
    ;(async () => {
      const [{ localUri }] = await Asset.loadAsync(require('../assets/scripts/main.bjs'))
      if (localUri) {
        const res = await fetch(localUri)
        const content = await res.text()
        setScriptOnStart(content)
      }
    })()

    const subscription = BackHandler.addEventListener('hardwareBackPress', function () {
      return true
    })

    return () => subscription.remove()
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

  return nIf(scriptOnStart, <MainPage contentJs={scriptOnStart} />)
}
