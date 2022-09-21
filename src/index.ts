import dotenv from 'dotenv'
import SpottyClient from './spotty-client'
import Server from './server'
import Service from './service'

dotenv.config({
  path: __dirname + '/../.env'
})

const s = new SpottyClient()
const ss = new Service(s)
const sss = new Server(s)

void async function() {
  // sss.start()
  await s.setAccessToken()
  await ss.saveCurrentPlaylists()
  ss.chunkLikes()
  await ss.createChunkedPlayists()
  await ss.rmFromLikes()
}()