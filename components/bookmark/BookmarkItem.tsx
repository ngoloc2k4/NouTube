import { View, Text, Pressable, ScrollView } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { observer, use$, useObservable } from '@legendapp/state/react'
import { Bookmark, bookmarks$ } from '@/states/bookmarks'
import { Image } from 'expo-image'
import { ui$, updateUrl } from '@/states/ui'
import { Button, ContextMenu } from '@expo/ui/jetpack-compose'
import { colors } from '@/lib/colors'
import { NouText } from '../NouText'
import { clsx } from '@/lib/utils'
import { getPageType, getVideoThumbnail } from '@/lib/page'
import { NouMenu } from '../menu/NouMenu'

/* https://www.youtube.com/watch?v=<id> */
function getThumbnail(url: string) {
  const id = new URL(url).searchParams.get('v')
  return id ? getVideoThumbnail(id) : undefined
}

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj['

export const BookmarkItem: React.FC<{ bookmark: Bookmark }> = ({ bookmark }) => {
  const onPress = () => {
    updateUrl(bookmark.url)
    ui$.assign({ libraryModalOpen: false })
  }

  const pageType = getPageType(bookmark.url)
  const round = pageType?.type == 'channel'
  const square = round || pageType?.home == 'yt-music'

  return (
    <View className="flex flex-row my-2 overflow-hidden px-2">
      <Pressable className={clsx(square ? 'w-[48px]' : 'w-[160px]')} onPress={onPress}>
        <Image
          source={bookmark.json?.thumbnail || getThumbnail(bookmark.url)}
          contentFit="cover"
          placeholder={{ blurhash }}
          cachePolicy="memory-disk"
          style={{ height: square ? 48 : 90, borderRadius: round ? 45 : 8 }}
        />
      </Pressable>
      <Pressable className="flex-1 ml-3" onPress={onPress}>
        <NouText className="leading-6" numberOfLines={4} ellipsizeMode="tail">
          {bookmark.title}
        </NouText>
      </Pressable>
      <View>
        <NouMenu
          trigger={
            <MaterialIcons.Button
              color={colors.icon}
              backgroundColor="transparent"
              iconStyle={{ marginRight: 0 }}
              name="more-vert"
              size={20}
            />
          }
          items={[
            { label: 'Edit', handler: () => ui$.bookmarkModalBookmark.set(bookmark) },
            { label: 'Remove', handler: () => bookmarks$.toggleBookmark(bookmark) },
          ]}
        />
      </View>
    </View>
  )
}
