import axios, { AxiosResponse } from 'axios'
import { ISpotifyPaginatedResponse, ISpotifyPlaylist, ISpotifyRefreshResponse, ISpotifyTrack } from 'jvb-spotty-models'

export default class SpottyClient {
  accessToken: string
  userId: string
  constructor() {
    this.userId = process.env.SpotifyUserId
  }

  async removeItemsFromPlaylist() {}

  async addItemsToPlaylist() {}

  async createPlaylist(name: string, description: string): Promise<ISpotifyPlaylist> {
    console.log('SpottyClient.createPlaylist')
    const r: AxiosResponse<ISpotifyPlaylist> = await axios({
      method: 'post',
      url: `https://api.spotify.com/v1/users/${this.userId}/playlists`,
      headers: {
        Authorization: 'Bearer ' + this.accessToken
      },
      data: {
        name,
        description,
      }
    })
    return r.data
  }

  async getAllPlaylistTracks(playlistId: string): Promise<ISpotifyTrack[]> {
    console.log('SpottyClient.getAllPlaylistTracks')
    throw new Error('WIP')
    const tracks: ISpotifyTrack[] = []
    let url = 'https://api.spotify.com/v1/me/playlists'
    do {
      console.log('  >', url)
      const r: AxiosResponse<ISpotifyPaginatedResponse<ISpotifyTrack>> = await axios({
        url,
        headers: {
          Authorization: 'Bearer ' + this.accessToken
        },
      })
      url = r.data.next
      tracks.push(...r.data.items)
    } while (url)
    return tracks
  }

  async getAllUsersPlaylists(): Promise<ISpotifyPlaylist[]> {
    console.log('SpottyClient.getAllUsersPlaylists')
    const playlists: ISpotifyPlaylist[] = []
    let url = 'https://api.spotify.com/v1/me/playlists'
    do {
      console.log('  >', url)
      const r: AxiosResponse<ISpotifyPaginatedResponse<ISpotifyPlaylist>> = await axios({
        url,
        headers: {
          Authorization: 'Bearer ' + this.accessToken
        },
      })
      url = r.data.next
      playlists.push(...r.data.items)
    } while (url)
    return playlists
  }

  async setAccessToken(): Promise<void> {
    console.log('SpottyClient.getAccessToken')
    const r: AxiosResponse<ISpotifyRefreshResponse> = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      params: {
        grant_type: 'refresh_token',
        refresh_token: process.env.RefreshToken
      },
      headers: this.basicAuthHeaders
    })
    this.accessToken = r.data.access_token
  }

  get basicAuth() {
    return Buffer
    .from(`${process.env.SpotifyClientId}:${process.env.SpotifyClientSecret}`)
    .toString('base64')
  }
  get basicAuthHeaders() {
    return {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${this.basicAuth}`
    }
  }
}