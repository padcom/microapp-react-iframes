import * as React from 'react'
import { render } from 'react-dom'
import { v4 as uuid } from 'uuid'

function sendMessageAndReturnResponse(message: string, params: any = null, source = 'application'): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = uuid()
    console.log(`app1: Sending message "${message}" with id "${id}"`)

    const responseHandler = event => {
      if (event.data.source === 'host' && event.data.id === id) {
        console.log(`app1: Received response to message "${id}": "${event.data.response}"`)

        window.removeEventListener('message', responseHandler)

        resolve(event.data.response)
      }
    }
    window.addEventListener('message', responseHandler)

    window.parent.postMessage({ id, source, message, params }, window.location.href)
  })
}

function sendMessageAndReturnResponseWithTimeout(message: string, params: any = null, source = 'application'): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = uuid()
    console.log(`app1: Sending message "${message}" with id "${id}"`)

    let timeout = null

    const responseHandler = event => {
      if (event.data.source === 'host' && event.data.id === id) {
        console.log(`app1: Received response to message "${id}": "${event.data.response}"`)

        window.removeEventListener('message', responseHandler)
        if (timeout) clearTimeout(timeout)

        resolve(event.data.response)
      }
    }
    window.addEventListener('message', responseHandler)

    setTimeout(() => {
      window.removeEventListener('message', responseHandler)
      reject('Timeout waiting for response')
    }, 1000)

    window.parent.postMessage({ id, source, message, params }, window.location.href)
  })
}

function App () {
  const [ message, setMessage ] = React.useState('(not initiaized yet)')

  const fetchData = () => {
    sendMessageAndReturnResponseWithTimeout('fetchMessage')
      .then((response: string) => setMessage(response))
  }

  return (
    <div>
      <h1>App 1! - { message }</h1>
      <button onClick={fetchData}>click me!</button>
    </div>
  )
}

render(<App />, document.getElementById('app'))

// --------------------------------------
// For demonstration purposes only
// --------------------------------------

function getMessageWithTimeout () {
  return new Promise((resolve, reject) => {
    const id = uuid.v4()
    console.log(`app1: Sending message with id ${id}`)

    let timeout = null

    const responseHandler = e => {
      if (e.data.source === 'host' && e.data.id === id) {
        if (timeout !== null) clearTimeout(timeout)
        console.log('Received response to message', id, ': "', e.data.response, '"')
        window.removeEventListener('message', responseHandler)
        resolve(e.data.response)
      }
    }

    window.addEventListener('message', responseHandler)

    timeout = setTimeout(() => {
      window.removeEventListener('message', responseHandler)
      reject(`Timeout when waiting for response to message ${id}`)
    }, 1000)

    window.parent.postMessage({
      id,
      source: 'application',
      message: 'fetchData',
      params: { x: 1 } 
    }, window.location.href)
  })
}