import * as React from 'react'
import { render } from 'react-dom'

import { webSocket } from 'rxjs/webSocket'

import './main.css'

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

function pollData (source: MessageEventSource, id: string, origin: string) {
  // @ts-ignore
  source.postMessage({ source: 'host', id, message: 'data', payload: { message: 'Hello' } }, origin)
}

const api = (event: MessageEvent) => {
  if (event.data.source == 'application') {
    console.log(`HOST: Received message "${event.data.message}" with id "${event.data.id}"`, event)

    switch (event.data.message) {
      case 'fetchMessage': {
        fetchMessage().then(response => {
          // @ts-ignore
          event.source.postMessage({ source: 'host', id: event.data.id, response }, event.origin)
        })
        break;
      }
      case 'startPollingData': {
        let ws: any = null
        // console.log('HOST: closing websocket', event.data.id)
        // ws.unsubscribe()
        ws = webSocket('ws://localhost:8080/').subscribe(
          msg => {
            console.log('HOST: received message over websocket', event.data.id, msg)
            // @ts-ignore
            event.source.postMessage({ source: 'host', id: event.data.id, state: 'data', payload: msg }, event.origin)
          },
          error => {
            console.log('HOST: error over websocket', event.data.id, error)
            // @ts-ignore
            event.source.postMessage({ source: 'host', id: event.data.id, state: 'error', error }, event.origin)
          },
          () => {
            console.log('HOST: websocket closed', event.data.id)
            // @ts-ignore
            event.source.postMessage({ source: 'host', id: event.data.id, state: 'closed' }, event.origin)
          }
        )

        const handler = (closeEvent: MessageEvent) => {
          if (closeEvent.data.source === 'application' && closeEvent.data.id === event.data.id) {
            switch (closeEvent.data.message) {
              case 'startPollingData-close': {
                console.log('HOST: Received unsubscribe event for socket', event.data.id)
                window.removeEventListener('message', handler)
                ws.unsubscribe()
                break;
              }
              default: {
                throw new Error(`Unrecognized message ${closeEvent.data.message}`)
              }
            }
          }
        }

        window.addEventListener('message', handler)

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
  ]

  React.useEffect(() => {
    console.log('Registering API')
    window.addEventListener('message', api)
    return () => {
      console.log('Unregistering API')
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
