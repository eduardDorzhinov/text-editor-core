import { $insertNodes } from "lexical";

import {
  VIDEO_ORIENTATION,
  VideoNode,
  VideoOrientation,
} from "./VideoNode";

export function insertVideo(
  src: string,
  preview: string,
  orientation: VideoOrientation = VIDEO_ORIENTATION.Horizontal,
) {
  const videoNode = new VideoNode(
    src,
    preview,
    orientation,
  );
  $insertNodes([ videoNode ]);
}
