import fs from 'fs'
import { ISpotifyPlaylist, ISpotifyTrack } from 'jvb-spotty-models';
import SpottyClient from "./spotty-client";

export default class Service {
  private spotty: SpottyClient
  private playlistsJson = __dirname + '/../data/playlists.json'
  private likesJson = __dirname + '/../data/likes-full.json'
  private chunksDir = __dirname + '/../data/chunks/'

  constructor(spotty: SpottyClient) {
    this.spotty = spotty
    if (!fs.existsSync(this.chunksDir)) {
      fs.mkdirSync(this.chunksDir)
    }
  }

  async getAllPlaylists() {
    await this.spotty.setAccessToken()
    const playlists = await this.spotty.getAllUsersPlaylists()
    fs.writeFileSync(this.playlistsJson, JSON.stringify(playlists, null, 2))
  }
  async saveLikes() {
    await this.spotty.setAccessToken()
    const playlistId = '123'
    const likedTracks = await this.spotty.getAllPlaylistTracks(playlistId)
    fs.writeFileSync(this.likesJson, JSON.stringify(likedTracks, null, 2))
  }
  async chunkLikes() {}
  async createChunkedPlayists() {
    await this.spotty.setAccessToken()
  }
  async rmFromLikes() {
    await this.spotty.setAccessToken()
  }
}