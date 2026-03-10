type Intro3DSceneProps = {
  progress: number;
};

function Intro3DScene({ progress }: Intro3DSceneProps) {
  const scale = 1 + progress * 0.16;
  const translateY = progress * 18;
  const overlayOpacity = 0.25 + progress * 0.35;

  return (
    <div className="intro-canvas-wrap" aria-hidden="true">
      <video
        className="intro-video"
        src="/SURIMI_video_home.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        style={{
          transform: `scale(${scale}) translateY(${translateY}px)`,
        }}
      />
      <div className="intro-video-tint" style={{ opacity: overlayOpacity }} />
    </div>
  );
}

export default Intro3DScene;
