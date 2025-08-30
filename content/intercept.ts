import { RE_INTERCEPT, transformPlayerResponse, transformSearchResponse } from '@/lib/intercept'

export function intercept() {
  const winFetch = fetch
  // @ts-expect-error xx
  window.fetch = async (...args) => {
    const request = args[0]
    const url = request instanceof Request ? request.url : request.toString()
    let res = await winFetch(...args)
    const match = new URL(url).pathname.match(RE_INTERCEPT)
    if (res.status > 200 || !match || (match[1] == 'search' && !window.NouTube.shortsHidden)) {
      return res
    }

    const text = await res.text()
    const responseInit = {
      status: res.status,
      headers: res.headers,
    }
    try {
      return new Response(
        match[1] == 'search' ? transformSearchResponse(text) : transformPlayerResponse(text),
        responseInit,
      )
    } catch (error) {
      console.error('NouScript:', error)
    }
    return new Response(text, responseInit)
  }

  // https://stackoverflow.com/a/78369686
  const xhrOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (method, url) {
    url = url.toString()
    this.addEventListener('readystatechange', function () {
      if (url.includes('youtubei/v1/player') && this.readyState === 4) {
        const text = transformPlayerResponse(this.responseText)
        Object.defineProperty(this, 'response', { writable: true })
        Object.defineProperty(this, 'responseText', { writable: true })
        // @ts-expect-error xx
        this.response = this.responseText = text
      }
    })
    return xhrOpen.apply(this, [method, url])
  }
}
