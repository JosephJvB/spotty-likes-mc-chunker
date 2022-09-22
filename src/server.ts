import express from 'express'
import fs from 'fs'
import SpottyClient from './spotty-client'

export default class Server {
  private tokenJsonFile = __dirname + '/../data/secrets/token.json'
  constructor(
    private readonly spotty: SpottyClient
  ) {}
  start() {
    const server = express()

    server.get('/', async (req, res) => {
      console.log('spotifyCode', req.query.code)
      const token = await this.spotty.submitCode(req.query.code as string)
      console.log('token', token)
      fs.writeFileSync(this.tokenJsonFile, JSON.stringify(token))
      res.send(200)
    })
    server.listen(3000, () => console.log('server started', this.spotty.startUrl))
  }
}