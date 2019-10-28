import * as React from 'react'
import { render } from 'react-dom'
import { v4 as uuid } from 'uuid'

import { Observable } from 'rxjs'
import { finalize, share } from 'rxjs/operators'

let HOST_ORIGIN = null

window.addEventListener('message', event => {
  if (event.data.source === 'host') {
    switch (event.data.message) {
      case 'metadata': {
        console.log('Received metadata', event.data.payload)
        HOST_ORIGIN = event.data.payload.hostOrigin
        break
      }
    }
  }
})

function parentWebsocketSubject(message, params = null, source = 'application'): Subject<any> {
  const id = uuid()

  return new Observable(subscriber => {
    const handler = event => {
      if (event.data.source === 'host' && event.data.id === id) {
        console.log('APP2: received message for subject', event.data)
        switch (event.data.state) {
          case 'data': {
            subscriber.next(event.data.payload)
            break
          }
          case 'error': {
            subscriber.error(event.data.error)
            break
          }
          case 'closed': {
            console.log('APP2: sending message to host to close the websocket')
            window.parent.postMessage({ id, source, message: message + '-close', params }, HOST_ORIGIN)
            window.removeEventListener('message', handler)
            break
          }
          default: {
            throw new Error(`Unknown state: ${event.data.state}`)
          }
        }
      }
    }
    window.addEventListener('message', handler)
    window.parent.postMessage({ id, source, message, params }, HOST_ORIGIN)

    return () => {
      console.log('APP2: cleaning up observable')
      window.parent.postMessage({ id, source, message: message + '-close', params }, HOST_ORIGIN)
      window.removeEventListener('message', handler)
    }
  })
}

function App () {
  React.useEffect(() => {
    const subject = parentWebsocketSubject('startPollingData')
    const subscription = subject.subscribe(data => { console.log('PARENT-WS:', data) })
    window.addEventListener('unload', e => {
      console.log('APP2: closing host websocket')
      subscription.unsubscribe()
    })
    return () => {
      console.log('APP2: closing host websocket')
      subscription.unsubscribe()
    }
  })

  return <h1>App 2!</h1>
}

render(<App />, document.getElementById('app'))

setTimeout(() => {
  // @ts-ignore
  console.log('App 2 rendered')
}, 100)
