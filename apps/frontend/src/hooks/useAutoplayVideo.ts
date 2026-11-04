import { useEffect } from "react";

type UseAutoplayVideoOptions = {
  playbackRate?: number;
  enabled?: boolean;
};

const playVideo = (video: HTMLVideoElement) => {
  const playAttempt = video.play();

  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {
      // Safari can reject an early autoplay attempt before metadata is ready.
    });
  }
};

export const useAutoplayVideo = (
  video: HTMLVideoElement | null,
  { playbackRate = 1, enabled = true }: UseAutoplayVideoOptions = {},
) => {
  useEffect(() => {
    if (!video) {
      return;
    }

    if (!enabled) {
      video.pause();
      return;
    }

    const syncVideoState = () => {
      video.defaultMuted = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.playbackRate = playbackRate;
      playVideo(video);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncVideoState();
      }
    };

    syncVideoState();

    video.addEventListener("loadedmetadata", syncVideoState);
    video.addEventListener("canplay", syncVideoState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      video.removeEventListener("loadedmetadata", syncVideoState);
      video.removeEventListener("canplay", syncVideoState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, playbackRate, video]);
};
