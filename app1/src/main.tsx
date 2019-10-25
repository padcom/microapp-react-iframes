import * as React from 'react'
import { render } from 'react-dom'
import { v4 as uuid } from 'uuid'

function sendMessageAndReturnResponse(message, params = null, source = 'application'): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = uuid()

    const responseHandler = event => {
      if (event.data.source === 'host' && event.data.id === id) {
        window.removeEventListener('message', responseHandler)
        resolve(event.data.response)
      }
    }
    window.addEventListener('message', responseHandler)

    window.parent.postMessage({ id, source, message, params }, window.location.href)
  })
}

function sendMessageAndReturnResponseWithTimeout(message, params = null, source = 'application'): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = uuid()
    console.log(`app1: Sending message "${message}" with id "${id}"`)

    let timeout = null

    const responseHandler = event => {
      if (event.data.source === 'host' && event.data.id === id) {
        console.log(`app1: Received response to message "${id}": "${JSON.stringify(event.data.response)}"`)

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
