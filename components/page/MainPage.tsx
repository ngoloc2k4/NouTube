import { auth$ } from '@/states/auth'
import { MainPageContent } from './MainPageContent'
import { supabase } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query/client'
import { useMe } from '@/lib/hooks/useMe'
import { BookmarkModal } from '../modal/BookmarkModal'
import { FolderModal } from '../modal/FolderModal'
import { LibraryModal } from '../modal/LibraryModal'
import { QueueModal } from '../modal/QueueModal'
import { SettingsModal } from '../modal/SettingsModal'
import { feederLoop } from '@/lib/feeder'
import { FeedModal } from '../modal/FeedModal'

export const MainPage: React.FC<{ contentJs: string }> = ({ contentJs }) => {
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      // console.log('onAuthStateChange', event, session)
      auth$.assign({
        loaded: true,
        userId: session?.user.id,
        user: session?.user.user_metadata,
        accessToken: session?.access_token,
      })
    })

    // Defer feederLoop to avoid blocking main thread on startup
    // Use setTimeout to push it to the next event loop tick
    const feedTimer = setTimeout(() => {
      feederLoop().catch((error) => {
        console.error('[NouTube] feederLoop error:', error)
      })
    }, 1000) // Delay by 1 second to allow UI to settle

    return () => {
      clearTimeout(feedTimer)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <MainPageContent contentJs={contentJs} />
      <LibraryModal />
      <BookmarkModal />
      <FeedModal />
      <FolderModal />
      <QueueModal />
      <SettingsModal />
    </QueryClientProvider>
  )
}
