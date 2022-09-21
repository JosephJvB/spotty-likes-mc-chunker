import fs from 'fs'
import readline from 'readline'
import { ISpotifyPlaylist, ISpotifyPlaylistTrack, ISpotifyTokenResponse } from 'jvb-spotty-models';
import SpottyClient from "./spotty-client";

export default class Service {
  private spotty: SpottyClient
  private tokenJsonFile = __dirname + '/../data/secrets/token.json'
  private likesJsonFile = __dirname + '/../data/likes-current.json'
  private playlistsJsonFile = __dirname + '/../data/playlists-all.json'
  private chunkJsonsDir = __dirname + '/../data/chunks/'

  constructor(spotty: SpottyClient) {
    this.spotty = spotty
    if (!fs.existsSync(this.chunkJsonsDir)) {
      fs.mkdirSync(this.chunkJsonsDir)
    }
    if (!fs.existsSync(__dirname + '/../data/secrets/')) {
      fs.mkdirSync(__dirname + '/../data/secrets/')
    }
    if (fs.existsSync(this.tokenJsonFile)) {
      const tokenJson: ISpotifyTokenResponse = require(this.tokenJsonFile)
      this.spotty.tokenJson = tokenJson
      console.log('loaded spotifytoken')
    } else {
      console.log('no spotty tokenJson found')
    }
  }

  async test() {
    const id = '6K4XDzgqM2QnA8mX482sRr'
    await this.spotty.setAccessToken()
    const r = await this.spotty.getAllPlaylistTracks(id)
    fs.writeFileSync(__dirname + '/../data/shoulder-shakers.json', JSON.stringify(r))
  }

  async saveCurrentPlaylists() {
    await this.spotty.setAccessToken()
    const likedTracks = await this.spotty.getLikedTracks()
    console.log('  > saving', likedTracks.length, 'likedTracks to json')
    fs.writeFileSync(this.likesJsonFile, JSON.stringify(likedTracks, null, 2))
    const allPlaylists = await this.spotty.getAllUsersPlaylists()
    console.log('  > saving', allPlaylists.length, 'playlists to json')
    fs.writeFileSync(this.playlistsJsonFile, JSON.stringify(allPlaylists, null, 2))

  }
  async chunkLikes() {
    const allLikes: ISpotifyPlaylistTrack[] = require(this.likesJsonFile)
    const allPlaylists: ISpotifyPlaylist[] = require(this.playlistsJsonFile)
    const existPlaylistMap: { [year: string]: boolean } = {}
    for (const p of allPlaylists) {
      const split = p.name.split(' ')
      if (split.length == 2 && !isNaN(Number(split[0])) && split[1] == 'likes' && p.description.includes('quirked')) {
        existPlaylistMap[split[0]] = true
      }
    }
    const byYear = {}
    for (const t of allLikes) {
      const date = new Date(t.added_at)
      const y = date.getFullYear()
      if (existPlaylistMap[y]) {
        console.error('  > track', t.track.name, 'from liked songs should belong to playlist "' + y, 'likes"')
        continue
      }

      if (!byYear[y]) {
        byYear[y] = []
      }
      byYear[y].push(t)
    }
    for (const y in byYear) {
      console.log('wrote', byYear[y].length, 'songs to', y, 'json file')
      fs.writeFileSync(this.chunkJsonsDir + y + '.json', JSON.stringify(byYear[y]))
    }
  }
  async createChunkedPlayists() {
    await this.spotty.setAccessToken()
    const yearFiles = fs.readdirSync(this.chunkJsonsDir)
    const allPlaylists: ISpotifyPlaylist[] = require(this.playlistsJsonFile)
    for (const f of yearFiles) {
      const year = f.split('.').shift()
      const thisYear = new Date().getFullYear()
      if (Number(year) == thisYear) {
        continue
      }
      const name = year + ' likes'
      const description = `tracks from ${year} to help a goated-with-the-sauce quirked up white boy bust it down sexual style`
      const existingPlaylist = allPlaylists.find(p => p.name == name && p.description == description)
      if (existingPlaylist) {
        console.log('  > playlist', name, 'already exists, skipping.')
        continue
      }
      const tracks: ISpotifyPlaylistTrack[] = require(this.chunkJsonsDir + f)
      tracks.sort((a, z) => new Date(z.added_at).getTime() - new Date(a.added_at).getTime())
      const uris = tracks.map(t => t.track.uri)
      const y1 = await this.confirm('  > create playlist ' + name + '? [y/n]')
      if (y1) {
        const playlist = await this.spotty.createPlaylist(name, description)
        const y2 = await this.confirm('  > add ' + tracks.length + ' tracks to ' + name + '? [y/n]')
        if (y2) {
          await this.spotty.addTracksToPlaylist(playlist.id, uris)
        }
      }
    }
  }
  async rmFromLikes() {
    await this.spotty.setAccessToken()
    const yearFiles = fs.readdirSync(this.chunkJsonsDir)
    for (const f of yearFiles) {
      const year = f.split('.').shift()
      const thisYear = new Date().getFullYear()
      if (Number(year) == thisYear) {
        continue
      }
      const tracks: ISpotifyPlaylistTrack[] = require(this.chunkJsonsDir + f)
      const uris = tracks.map(t => t.track.id)
      console.log('  > remove year from liked songs', year)
      const y = await this.confirm('  > remove ' + tracks.length + 'tracks?')
      if (y) {
        await this.spotty.removeLikedTracks(uris)
      }
    }
  }
  confirm(msg: string = 'are you sure you want to continue? [y/n]') {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    return new Promise(resolve => {
      rl.question(msg, (ans) => {
        rl.close()
        resolve(ans == 'y')
      })
    })
  }
}