import { ISpotifyProfile, ISpotifyTrack } from "jvb-spotty-models";

export interface ISpotifyLikedTrack {
  added_at: string
  track: ISpotifyTrack
  // added_by: ISpotifyProfile
}