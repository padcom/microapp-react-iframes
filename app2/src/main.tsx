import * as React from 'react'
import { render } from 'react-dom'
import { v4 as uuid } from 'uuid'

import { Observable } from 'rxjs'

let HOST_ORIGIN = null

// this event listener handles global messges from the host
// like for example receiving application's metadata
window.addEventListener('message', event => {
  if (event.data.source === 'host') {
    switch (event.data.message) {
      case 'metadata': {
        console.log('APP2: Received metadata', event.data.payload)
        HOST_ORIGIN = event.data.payload.hostOrigin

        // now that we have the metadata we can start the application
        render(<App />, document.getElementById('app'))

        break
      }
    }
  }
})

interface ExampleWebsocketPayload {
  timestamp: string
}

/**
 * Create a proxied websocket observable
 * 
 * @param message message to send to the parent to connect the websocket
 * @param params optional parameters to send with the message
 * @param source optional alternate source for the message (leave alone!)
 */
function websocket<T> (message, params = null, source = 'application'): Observable<T> {
  const id = uuid()

  // create observable that will transfer the data to the subscriber
  return new Observable<T>(subscriber => {
    const handler = (event: MessageEvent) => {
      if (event.data.source === 'host' && event.data.id === id) {
        console.log('APP2: received message for subject', event.data)
        switch (event.data.state) {
          case 'data': {
            console.log('APP2: websocket data', event.data.payload)
            subscriber.next(event.data.payload)
            break
          }
          case 'error': {
            console.log('APP2: websocket error', event.data.error)
            subscriber.error(event.data.error)
            break
          }
          case 'closed': {
            console.log('APP2: websocket closed')
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

    // send message to parent to start websocket
    window.parent.postMessage({ id, source, message, params }, HOST_ORIGIN)

    // this code is called when we unsubscribe from the subscription
    return () => {
      console.log('APP2: cleaning up observable')
      window.parent.postMessage({ id, source, message: 'close-websocket', params }, HOST_ORIGIN)
      window.removeEventListener('message', handler)
    }
  })
}

function App () {
  const [ messages, setMessages ] = React.useState([])

  React.useEffect(() => {
    // create subscription
    const subscription = websocket<ExampleWebsocketPayload>('example-websocket').subscribe(data => {
      console.log('APP2: data from parent websocket', data, messages)
      setMessages(msgs => [ ...msgs, data.timestamp ])
    })

    // this event is fired when we switch away from the application
    window.addEventListener('unload', e => {
      console.log('APP2: closing host websocket')
      subscription.unsubscribe()
    })

    // this is fired when a component is unmounted (doesn't happen at all on root-level component
    // hence the 'unload' global event handler above)
    return () => {
      console.log('APP2: closing host websocket')
      subscription.unsubscribe()
    }
  }, [])

  return (
    <div>
      <h1>App 2!</h1>
      <ul>
        { messages.map(message => <li key={message}>{message}</li>) }
      </ul>
    </div>
  )
}
