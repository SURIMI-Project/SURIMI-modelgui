import { useState } from "react";
import { useAutoplayVideo } from "../../../../hooks/useAutoplayVideo";
import styles from "./Intro3DScene.module.css";

type Intro3DSceneProps = {
  progress: number;
};

const Intro3DScene = ({ progress }: Intro3DSceneProps) => {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const scale = 1 + progress * 0.16;
  const translateY = progress * 18;
  const overlayOpacity = 0.25 + progress * 0.35;

  useAutoplayVideo(videoElement);

  return (
    <div className={styles["intro-canvas-wrap"]} aria-hidden="true">
      <video
        ref={setVideoElement}
        className={styles["intro-video"]}
        preload="metadata"
        autoPlay
        muted
        loop
        playsInline
        disablePictureInPicture
        style={{
          transform: `scale(${scale}) translateY(${translateY}px)`,
        }}
      >
        <source src="/SURIMI_video_home.mp4" type="video/mp4" />
      </video>
      <div className={styles["intro-video-tint"]} style={{ opacity: overlayOpacity }} />
    </div>
  );
};

export default Intro3DScene;
