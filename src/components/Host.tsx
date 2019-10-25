import * as React from 'react'
import './Host.css'

function fetchMessage () {
  return fetch('/api/message')
    .then(response => {
      if (!response.ok) {
        throw new Error(response.statusText)
      } else {
        return response.json()
      }
    })
    .then(data => data.message)
}

const api = event => {
  if (event.data.source == 'application') {
    console.log(`HOST: Received message "${event.data.message}" with id "${event.data.id}"`)
    switch (event.data.message) {
      case 'fetchMessage': {
        fetchMessage().then(response => {
          event.source.postMessage({ source: 'host', id: event.data.id, response })
        })
        break;
      }
    }
  }
}

export default function () {
  const [ page, setPage ] = React.useState('/app1')

  const pages = [
    { title: 'App1', src: '/app1' },
    { title: 'App2', src: '/app2' },
  ]

  React.useEffect(() => {
    console.log('Registering API')
    window.addEventListener('message', api)
    return () => {
      console.log('Unregistering API')
      window.removeEventListener('message', api)
    }
  })

  return (
    <div className="app">
      <div className="header"><h1>Header!</h1></div>
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
        <iframe src={page}></iframe>
      </div>
      <div className="footer">Footer</div>
    </div>
  )
}
