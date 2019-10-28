import * as React from 'react'
import { render } from 'react-dom'

import { webSocket } from 'rxjs/webSocket'

import './main.css'

/**
 * Just a simple method that fetches something from the backend
 */
function fetchMessage () {
  return fetch('/api/message')
    .then(response => {
      if (!response.ok) {
        throw new Error(response.statusText)
      } else {
        return response.json()
      }
    })
    .then(data => data)
}

/**
 * Open a websocket and forward its messages to the sender.
 * 
 * @param url URL of the websocket to connect to
 * @param id correlation id
 * @param source source frame to send the data to
 * @param origin origin of the source frame - needed for apps served from another domain
 */
function startWebSocket(url: string, id: string, source: MessageEventSource, origin: string) {
  const ws = webSocket(url).subscribe(
    payload => {
      console.log('HOST: received message over websocket', id, payload)
      // @ts-ignore
      source.postMessage({ source: 'host', id, state: 'data', payload }, origin)
    },
    error => {
      console.log('HOST: error over websocket', id, error)
      // @ts-ignore
      source.postMessage({ source: 'host', id, state: 'error', error }, origin)
    },
    () => {
      console.log('HOST: websocket closed', id)
      // @ts-ignore
      source.postMessage({ source: 'host', id, state: 'closed' }, origin)
    }
  )

  const handler = (event: MessageEvent) => {
    if (event.data.source === 'application' && event.data.id === id) {
      switch (event.data.message) {
        case 'close-websocket': {
          console.log('HOST: Received unsubscribe event for socket', id)
          window.removeEventListener('message', handler)
          ws.unsubscribe()
          break;
        }
        default: {
          throw new Error(`Unrecognized message ${event.data.message}`)
        }
      }
    }
  }

  window.addEventListener('message', handler)
}

const api = (event: MessageEvent) => {
  if (event.data.source == 'application') {
    console.log(`HOST: Received message "${event.data.message}" with id "${event.data.id}"`, event)

    switch (event.data.message) {
      case 'fetch-message': {
        fetchMessage().then(response => {
          // @ts-ignore
          event.source.postMessage({ source: 'host', id: event.data.id, response }, event.origin)
        })
        break;
      }
      case 'example-websocket': {
        startWebSocket('ws://localhost:8080/', event.data.id, event.source, event.origin)
        break
      }
    }
  }
}

function sendMessageToIFrame(iframe: HTMLIFrameElement, message: string, payload: any) {
  iframe.contentWindow.postMessage({ source: 'host', message, payload }, new URL(iframe.src).origin)
}

function Host() {
  const [ page, setPage ] = React.useState('/app1')
  const iframe = React.useRef()

  const pages = [
    { title: 'App1', src: '/app1' },
    { title: 'App2', src: '/app2' },
    { title: 'App1-remote', src: 'http://localhost:8001/app1' },
    { title: 'App2-remote', src: 'http://localhost:8002/app2' },
  ]

  React.useEffect(() => {
    console.log('HOST: Registering API')
    window.addEventListener('message', api)
    return () => {
      console.log('HOST: Unregistering API')
      window.removeEventListener('message', api)
    }
  })

  function sendMetadata() {
    sendMessageToIFrame(iframe.current as HTMLIFrameElement, 'metadata', {
      hostOrigin: window.location.origin,
      greeting: 'Hello, world! from host application'
    })
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Header!</h1>
      </div>
      <div className="nav">
        <ul> 
        {
          pages.map(page => (
            <li key={page.src} className="nav-item" onClick={() => setPage(page.src)}>
              {page.title}
            </li>
          ))
        }
        </ul>
      </div>
      <div className="content">
        <iframe src={page} ref={iframe} onLoad={sendMetadata}></iframe>
      </div>
      <div className="footer">
        <h5>Footer</h5>
      </div>
    </div>
  )
}

render(<Host />, document.getElementById('app'))
