import * as React from 'react'
import { render } from 'react-dom'
import { v4 as uuid } from 'uuid'

let HOST_ORIGIN = null

// this event listener handles global messges from the host
// like for example receiving application's metadata
function masterMessageHandler (event: MessageEvent) {
  if (event.data.source === 'host') {
    switch (event.data.message) {
      case 'metadata': {
        console.log('APP1: Received metadata', event.data.payload)
        HOST_ORIGIN = event.data.payload.hostOrigin

        // now that we have the metadata we can start the application
        render(<App />, document.getElementById('app'))

        break
      }
    }
  }
}

window.addEventListener('message', masterMessageHandler)

/**
 * Sends an ajax request and returns when the parent promise resolves
 * 
 * @param message message to send to the parent to connect the websocket
 * @param params optional parameters to send with the message
 * @param source optional alternate source for the message (leave alone!)
 */
function sendMessageAndReturnResponse(message, params = null, source = 'application'): Promise<any> {
  return new Promise(resolve => {
    const id = uuid()

    const responseHandler = event => {
      if (event.data.source === 'host' && event.data.id === id) {
        window.removeEventListener('message', responseHandler)
        resolve(event.data.response)
      }
    }
    window.addEventListener('message', responseHandler)

    // -> if we're on the same domain this will suffice
    // window.parent.postMessage({ id, source, message, params })
    // -> otherwise we need to specify the origin of the parent window
    // window.parent.postMessage({ id, source, message, params }, 'http://localhost:8080')

    // to make it universal the origin is being sent as part of the metadata
    window.parent.postMessage({ id, source, message, params }, HOST_ORIGIN)
  })
}

/**
 * Sends an ajax request and returns when the parent promise resolves.
 * In the case the response doesn't return in a predefined timeout it will
 * throw an error that can be further checked.
 * 
 * To see the error in action open the application without host at http://localhost:8001/app1
 * 
 * @param message message to send to the parent to connect the websocket
 * @param params optional parameters to send with the message
 * @param timeout optional timeout (default: 1s)
 * @param source optional alternate source for the message (leave alone!)
 */
function sendMessageAndReturnResponseWithTimeout(message, params = null, timeout: number = 1000, source = 'application'): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = uuid()
    console.log(`APP1: Sending message "${message}" with id "${id}"`)

    let timeoutHandle = null

    // this handler is used to capture the response from the parent window
    const responseHandler = event => {
      if (event.data.source === 'host' && event.data.id === id) {
        console.log(`APP1: Received response to message "${id}": "${JSON.stringify(event.data.response)}"`)

        window.removeEventListener('message', responseHandler)
        clearTimeout(timeoutHandle)

        resolve(event.data.response)
      }
    }

    // this handler is used to throw error when the response wasn't received in the aloted time
    const timeoutHandler = () => {
      window.removeEventListener('message', responseHandler)
      reject('Timeout waiting for response')
    }

    window.addEventListener('message', responseHandler)
    timeoutHandle = setTimeout(timeoutHandler, timeout)

    window.parent.postMessage({ id, source, message, params }, HOST_ORIGIN)
  })
}

function App () {
  const [ message, setMessage ] = React.useState('(not initiaized yet)')

  const fetchData = () => {
    sendMessageAndReturnResponseWithTimeout('fetch-message')
      .then(response => setMessage(response.message))
  }

  return (
    <div>
      <h1>App 1! - { message }</h1>
      <button onClick={fetchData}>click me!</button>
    </div>
  )
}

render(<App />, document.getElementById('app'))
