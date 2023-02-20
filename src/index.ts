import { onKeyPress } from './input'
import { userId } from './auth'
import render from './render'
import log from './log'
import { connect } from './websocket'
import createStore from './store'
import {
  keyPressToAction,
  gameEventToAction,
  localActionToRemoteAction,
} from './mappers'

let main = async (gameId: string) => {
  log.info('hello world')

  let uid = await userId()
  let client = await connect(gameId)
  let store = createStore()

  onKeyPress(key => {
    let state = store.getState()
    let action = keyPressToAction(state, key)
    store.dispatch(action)

    let remoteAction = localActionToRemoteAction(action, uid, gameId)
    if (remoteAction) {
      client.emit(remoteAction)
    }
  })

  client.onGameEvent(event => {
    let action = gameEventToAction(event)
    store.dispatch(action)
  })

  // Sync all events so far prior to hooking up renders to avoid useless paints
  let initEvents = await client.syncAllEvents()
  initEvents.forEach(event => {
    let action = gameEventToAction(event)
    store.dispatch(action)
  })

  store.subscribe(() => {
    let state = store.getState()
    render(state)
  })

  render(store.getState())
}

let gameId = process.argv.at(2)
if (!gameId) {
  console.error(`usage: ${process.argv[1]} <game_id>`)
  process.exit(1)
}

main(gameId).catch(err => {
  log.error(err)
  console.error(err)
})
