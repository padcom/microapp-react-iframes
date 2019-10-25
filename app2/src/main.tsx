import * as React from 'react'
import { render } from 'react-dom'

function App () {
  return <h1>App 2!</h1>
}

render(<App />, document.getElementById('app'))

setTimeout(() => {
  // @ts-ignore
  console.log('App 2 rendered')
}, 100)
