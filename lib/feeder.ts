import { syncState, when } from '@legendapp/state'
import { bookmarks$, newBookmark , Bookmark } from '@/states/bookmarks'
import { getPageType } from './page'
import { XMLParser } from 'fast-xml-parser'
import { mainClient } from '../desktop/src/renderer/ipc/main'
import { normalizeUrl } from './url'
import { feeds$ } from '@/states/feeds'
import * as cheerio from 'cheerio/slim'
import { ui$ } from '@/states/ui'
import { settings$ } from '@/states/settings'

export async function feederLoop() {
  try {
    await when([syncState(feeds$).isPersistLoaded])
    if (!settings$.feedsEnabled.get()) {
      return
    }

    const bookmarks = bookmarks$.bookmarks.get()
    let channels = bookmarks.filter((x) => {
      const pageType = getPageType(x.url)
      return !x.json.deleted && pageType?.home == 'yt' && pageType.type == 'channel'
    })
    const channelsWithoutId = channels.filter((x) => !x.json.id)
    
    // Process channel IDs in smaller batches to avoid blocking
    const batchSize = 5
    for (let i = 0; i < channelsWithoutId.length; i += batchSize) {
      const batch = channelsWithoutId.slice(i, i + batchSize)
      await Promise.all(batch.map((x) => getChannelId(x)))
      // Allow event loop to process other tasks between batches
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    
    if (channelsWithoutId.length) {
      channels = bookmarks.filter((x) => {
        const pageType = getPageType(x.url)
        return !x.json.deleted && pageType?.home == 'yt' && pageType.type == 'channel'
      })
    }
    const channelIds = channels.map((x) => x.json.id!)
    feeds$.setFeeds(channelIds)
    
    // Fetch channels in smaller batches to avoid blocking
    for (let i = 0; i < channelIds.length; i += batchSize) {
      const batch = channelIds.slice(i, i + batchSize)
      await Promise.all(batch.map((id) => fetchChannel(id)))
      // Allow event loop to process other tasks between batches
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  } catch (error) {
    console.error('[NouTube] feederLoop error:', error)
    // Don't throw - just log the error to prevent app crashes
  }
}

async function getChannelId(bookmark: Bookmark) {
  const html = await mainClient.fetchFeed(bookmark.url)
  const $ = cheerio.load(html)
  const feedUrl = $('link[type="application/rss+xml"]').attr('href')
  if (feedUrl) {
    const id = new URL(feedUrl).searchParams.get('channel_id')
    if (id) {
      bookmark.json.id = id
      bookmarks$.saveBookmark(bookmark)
    }
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
})

const threshold = 2 * 3600 * 1000 // 2 hours

async function fetchChannel(id: string) {
  if (!id) {
    return
  }
  const feed = feeds$.feeds.get().find((x) => x.id == id)
  if (!feed || Date.now() - feed.fetchedAt.valueOf() < threshold) {
    return
  }
  const xml = await mainClient.fetchFeed(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`)
  const data = parser.parse(xml)
  const bookmarks = data.feed.entry.map((x: any) =>
    newBookmark({
      title: x.title,
      url: x.link.href,
      created_at: new Date(x.published),
      updated_at: new Date(x.updated),
      json: {
        id,
      },
    }),
  )
  feeds$.importBookmarks(bookmarks)
  feeds$.saveFeed({ ...feed, fetchedAt: new Date() })
}
