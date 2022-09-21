import axios, { AxiosResponse } from 'axios'
import { ISpotifyPaginatedResponse, ISpotifyPlaylist, ISpotifyPlaylistTrack, ISpotifyRefreshResponse, ISpotifyTokenResponse, ISpotifyTrack } from 'jvb-spotty-models'

export default class SpottyClient {
  private accessToken: string
  tokenJson: ISpotifyTokenResponse
  userId: string
  constructor() {
    this.userId = process.env.SpotifyUserId
    axios.interceptors.response.use(
      r => r,
      error => {
        if (error.isAxiosError) {
          console.error(error.toJSON())
          console.error('data', error.response.data)
          console.error('code', error.response.status)
        } else {
          console.error(error)
        }
        console.error('Axios request failed')
        process.exit()
      },
    )
  }

  async removeLikedTracks(trackIds: string[]) {
    console.log('SpottyClient.removeLikedTracks')
    for (let i = 0; i < trackIds.length; i += 50) {
      const b = trackIds.slice(i, i + 50)
      await axios({
        method: 'delete',
        url: `https://api.spotify.com/v1/me/tracks`,
        headers: {
          Authorization: 'Bearer ' + this.accessToken
        },
        data: {
          ids: b
        }
      })
    }
  }

  async addTracksToPlaylist(playlistId: string, trackUris: string[]) {
    console.log('SpottyClient.addTracksToPlaylist')
    for (let i = 0; i < trackUris.length; i += 100) {
      const b = trackUris.slice(i, i + 100)
      await axios({
        method: 'post',
        url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        headers: {
          Authorization: 'Bearer ' + this.accessToken
        },
        data: {
          uris: b
        }
      })
    }
  }

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

  async getLikedTracks(): Promise<ISpotifyPlaylistTrack[]> {
    console.log('SpottyClient.getLikedTracks')
    const tracks: ISpotifyPlaylistTrack[] = []
    let url = `https://api.spotify.com/v1/me/tracks`
    do {
      console.log('  >', url)
      const r: AxiosResponse<ISpotifyPaginatedResponse<ISpotifyPlaylistTrack>> = await axios({
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

  async getAllPlaylistTracks(playlistId: string): Promise<ISpotifyTrack[]> {
    console.log('SpottyClient.getAllPlaylistTracks')
    const tracks: ISpotifyTrack[] = []
    let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`
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
    if (this.accessToken) {
      return
    }
    console.log('SpottyClient.getAccessToken')
    const r: AxiosResponse<ISpotifyRefreshResponse> = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      params: {
        grant_type: 'refresh_token',
        refresh_token: this.tokenJson.refresh_token
      },
      headers: this.basicAuthHeaders
    })
    this.accessToken = r.data.access_token
  }
  async submitCode(spotifyCode: string) {
    console.log('SpottyClient.submitCode:', spotifyCode)
    const r = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      params: {
        code: spotifyCode,
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000'
      },
      headers: this.basicAuthHeaders
    })
    return r.data
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
  get startUrl() {
    return 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
      response_type: 'code',
      client_id: process.env.SpotifyClientId,
      scope: [
        'user-read-private',
        'user-read-email',
        'user-top-read',
        'user-read-recently-played',
        'playlist-read-private',
        'playlist-read-collaborative',
        'playlist-modify-private',
        'playlist-modify-public',
        'user-library-modify',
        'user-library-read',
      ].join(' '),
      redirect_uri: 'http://localhost:3000',
    })
  }
}