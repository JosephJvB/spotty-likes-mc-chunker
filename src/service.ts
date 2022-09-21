import fs from 'fs'
import readline from 'readline'
import { ISpotifyPlaylist, ISpotifyPlaylistTrack, ISpotifyTokenResponse } from 'jvb-spotty-models';
import SpottyClient from "./spotty-client";

export default class Service {
  private spotty: SpottyClient
  private tokenJsonFile = __dirname + '/../data/secrets/token.json'
  private likesJsonFile = __dirname + '/../data/likes-current.json'
  private playlistsJsonFile = __dirname + '/../data/playlists-all.json'
  private tracksToRemoveJsonFile = __dirname + '/../data/to-remove.json'
  private chunkJsonsDir = __dirname + '/../data/chunks/'
  private _existingPlaylistMap: { [year: string]: boolean }

  constructor(spotty: SpottyClient) {
    this.spotty = spotty
    if (!fs.existsSync(this.chunkJsonsDir)) {
      fs.mkdirSync(this.chunkJsonsDir)
    }
    if (!fs.existsSync(__dirname + '/../data/secrets/')) {
      fs.mkdirSync(__dirname + '/../data/secrets/')
    }
    if (fs.existsSync(this.tokenJsonFile)) {
      const tokenJson: ISpotifyTokenResponse = this.loadJson(this.tokenJsonFile)
      this.spotty.tokenJson = tokenJson
      console.log('loaded spotifytoken')
    } else {
      console.log('no spotty tokenJson found')
    }
  }

  async test() {
    const id = '6K4XDzgqM2QnA8mX482sRr'
    const r = await this.spotty.getAllPlaylistTracks(id)
    fs.writeFileSync(__dirname + '/../data/shoulder-shakers.json', JSON.stringify(r))
  }

  async saveCurrentPlaylists() {
    const likedTracks = await this.spotty.getLikedTracks()
    console.log('  > saving', likedTracks.length, 'likedTracks to json')
    fs.writeFileSync(this.likesJsonFile, JSON.stringify(likedTracks, null, 2))
    const allPlaylists = await this.spotty.getAllUsersPlaylists()
    console.log('  > saving', allPlaylists.length, 'playlists to json')
    fs.writeFileSync(this.playlistsJsonFile, JSON.stringify(allPlaylists, null, 2))

  }
  async chunkLikes() {
    const allLikes: ISpotifyPlaylistTrack[] = this.loadJson(this.likesJsonFile)
    const byYear = {}
    for (const t of allLikes) {
      const date = new Date(t.added_at)
      const y = date.getFullYear()
      if (this.existingPlaylistMap[y]) {
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
    const yearFiles = fs.readdirSync(this.chunkJsonsDir)
    const allPlaylists: ISpotifyPlaylist[] = this.loadJson(this.playlistsJsonFile)
    const likedTracksToRemove: ISpotifyPlaylistTrack[] = []
    const thisYear = new Date().getFullYear()
    for (const f of yearFiles) {
      const year = f.split('.').shift()
      if (Number(year) == thisYear) {
        console.log('  > skip playlist create for this year:', thisYear)
        continue
      }
      const name = year + ' likes'
      const description = `tracks from ${year} to help a goated-with-the-sauce quirked up white boy bust it down sexual style`
      const existingPlaylist = allPlaylists.find(p => p.name == name && p.description == description)
      if (existingPlaylist) {
        console.log('  > playlist', name, 'already exists, skipping.')
        continue
      }
      const tracks: ISpotifyPlaylistTrack[] = this.loadJson(this.chunkJsonsDir + f)
      tracks.sort((a, z) => new Date(z.added_at).getTime() - new Date(a.added_at).getTime())
      const uris = tracks.map(t => t.track.uri)
      const y1 = await this.confirm('  > create playlist ' + name + '? [y/n]')
      if (y1) {
        const playlist = await this.spotty.createPlaylist(name, description)
        const y2 = await this.confirm('  > add ' + tracks.length + ' tracks to ' + name + '? [y/n]')
        if (y2) {
          await this.spotty.addTracksToPlaylist(playlist.id, uris)
          likedTracksToRemove.push(...tracks)
        }
      }
    }
    fs.writeFileSync(this.tracksToRemoveJsonFile, JSON.stringify(likedTracksToRemove))
  }
  async rmFromLikes() {
    const thisYear = new Date().getFullYear()
    const toRemove: ISpotifyPlaylistTrack[] = this.loadJson(this.tracksToRemoveJsonFile)
      .filter(t => {
        return new Date(t.added_at).getFullYear() != thisYear
      })
    const trackIds = toRemove.map(t => t.track.id)
    if (!trackIds.length) {
      console.log('  > no tracks to remove from likes')
      return
    }
    const y = await this.confirm('  > remove ' + toRemove.length + 'tracks from liked songs? [y/n]')
    if (y) {
      await this.spotty.removeLikedTracks(trackIds)
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
  loadJson(file: string) {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  }
  get existingPlaylistMap() {
    if (!this._existingPlaylistMap) {
      this._existingPlaylistMap = {}
      const allPlaylists: ISpotifyPlaylist[] = this.loadJson(this.playlistsJsonFile)
      const existPlaylistMap: { [year: string]: boolean } = {}
      for (const p of allPlaylists) {
        const split = p.name.split(' ')
        if (split.length == 2 && !isNaN(Number(split[0])) && split[1] == 'likes' && p.description.includes('quirked')) {
          existPlaylistMap[split[0]] = true
        }
      }
    }
    return this._existingPlaylistMap
  }
}