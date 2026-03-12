import { motion } from "framer-motion";
import styles from "./OceanDiveIntro.module.css";

type BubbleSpec = {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
};

type ParticleSpec = {
  id: number;
  left: number;
  top: number;
  delay: number;
  duration: number;
  drift: number;
  scale: number;
};

type RaySpec = {
  id: number;
  left: number;
  width: number;
  angle: number;
  delay: number;
  opacity: number;
};

type OceanDiveIntroProps = {
  durationMs: number;
};

const fract = (value: number) => value - Math.floor(value);

const seededUnit = (index: number, salt: number) => {
  return fract(Math.sin((index + 1) * 97.13 + salt * 33.17) * 43758.5453);
};

const bubbleSpecs: BubbleSpec[] = Array.from({ length: 20 }, (_, index) => {
  const left = 4 + seededUnit(index, 1.1) * 92;
  const size = 3 + seededUnit(index, 1.9) * 12;
  const delay = seededUnit(index, 2.7) * 2.6;
  const duration = 1.8 + seededUnit(index, 3.8) * 2.4;
  const drift = -24 + seededUnit(index, 4.9) * 48;

  return {
    id: index,
    left,
    size,
    delay,
    duration,
    drift,
  };
});

const particleSpecs: ParticleSpec[] = Array.from({ length: 42 }, (_, index) => {
  const left = seededUnit(index, 6.3) * 100;
  const top = seededUnit(index, 7.1) * 100;
  const delay = seededUnit(index, 7.9) * 2.8;
  const duration = 3.2 + seededUnit(index, 8.7) * 3.9;
  const drift = -10 + seededUnit(index, 9.4) * 20;
  const scale = 0.45 + seededUnit(index, 10.1) * 0.95;

  return {
    id: index,
    left,
    top,
    delay,
    duration,
    drift,
    scale,
  };
});

const raySpecs: RaySpec[] = [
  { id: 1, left: -18, width: 32, angle: 9, delay: 0.12, opacity: 0.18 },
  { id: 2, left: 8, width: 26, angle: 5, delay: 0.38, opacity: 0.16 },
  { id: 3, left: 28, width: 18, angle: -4, delay: 0.54, opacity: 0.14 },
  { id: 4, left: 56, width: 24, angle: -8, delay: 0.22, opacity: 0.18 },
  { id: 5, left: 74, width: 30, angle: -6, delay: 0.42, opacity: 0.13 },
];

const CAMERA_EASE = [0.22, 1, 0.36, 1] as const;

const OceanDiveIntro = ({ durationMs }: OceanDiveIntroProps) => {
  const durationSeconds = Math.max(durationMs / 1000, 0.1);

  return (
    <motion.section
      aria-hidden="true"
      className={styles.introRoot}
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{
        duration: durationSeconds,
        times: [0, 0.84, 1],
        ease: "easeInOut",
      }}
    >
      <motion.div
        className={styles.surfaceLayer}
        initial={{ scale: 1, y: 0 }}
        animate={{
          scale: [1, 1.06, 1.22],
          y: [0, 16, 98],
          filter: [
            "saturate(1.08) contrast(1.02) brightness(1)",
            "saturate(1.16) contrast(1.06) brightness(0.95)",
            "saturate(0.9) contrast(1.12) brightness(0.72)",
          ],
        }}
        transition={{
          duration: durationSeconds,
          times: [0, 0.42, 1],
          ease: CAMERA_EASE,
        }}
      >
        <img
          src="/4.jpeg"
          alt=""
          aria-hidden="true"
          className={styles.surfaceImage}
          loading="eager"
          decoding="async"
        />
      </motion.div>

      <motion.div
        className={styles.sunWrap}
        animate={{ opacity: [0.78, 0.86, 0.2], scale: [1, 1.06, 1.22] }}
        transition={{
          duration: durationSeconds,
          times: [0, 0.4, 1],
          ease: CAMERA_EASE,
        }}
      />

      <motion.div
        className={styles.surfaceBreak}
        initial={{ y: "-120%", opacity: 0 }}
        animate={{ y: ["-120%", "-20%", "118%"], opacity: [0, 0.95, 0] }}
        transition={{
          duration: durationSeconds * 0.72,
          delay: durationSeconds * 0.08,
          times: [0, 0.47, 1],
          ease: CAMERA_EASE,
        }}
      />

      <motion.div
        className={styles.underwaterLayer}
        initial={{ opacity: 0, scale: 1.12, y: -30 }}
        animate={{
          opacity: [0, 0.04, 1, 1],
          scale: [1.12, 1.1, 1.02, 1],
          y: [-30, -24, -6, 0],
        }}
        transition={{
          duration: durationSeconds,
          times: [0, 0.22, 0.58, 1],
          ease: CAMERA_EASE,
        }}
      >
        <div className={styles.rayField}>
          {raySpecs.map((ray) => (
            <motion.span
              key={ray.id}
              className={styles.godRay}
              style={{
                left: `${ray.left}%`,
                width: `${ray.width}%`,
                rotate: `${ray.angle}deg`,
              }}
              animate={{
                opacity: [ray.opacity * 0.55, ray.opacity, ray.opacity * 0.48],
                y: [-20, 28, 10],
              }}
              transition={{
                duration: 3.8,
                delay: ray.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <div className={styles.particleField}>
          {particleSpecs.map((particle) => (
            <motion.span
              key={particle.id}
              className={styles.particle}
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                scale: particle.scale,
              }}
              animate={{
                x: [0, particle.drift, particle.drift * 0.36],
                y: [0, -32, -62],
                opacity: [0.04, 0.28, 0.06],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <div className={styles.bubbleField}>
          {bubbleSpecs.map((bubble) => (
            <motion.span
              key={bubble.id}
              className={styles.bubble}
              style={{
                left: `${bubble.left}%`,
                width: `${bubble.size}px`,
                height: `${bubble.size}px`,
              }}
              animate={{
                y: ["0vh", "-118vh"],
                x: [0, bubble.drift, bubble.drift * 0.42],
                opacity: [0, 0.56, 0],
                scale: [0.82, 1, 1.1],
              }}
              transition={{
                duration: bubble.duration,
                delay: bubble.delay,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}
        </div>

        <motion.div
          className={styles.panelEchoes}
          animate={{ opacity: [0, 0, 0.44, 0] }}
          transition={{
            duration: durationSeconds,
            times: [0, 0.54, 0.82, 1],
            ease: "easeInOut",
          }}
        />
      </motion.div>

      <motion.div
        className={styles.vignette}
        animate={{ opacity: [0.2, 0.34, 0.1] }}
        transition={{
          duration: durationSeconds,
          times: [0, 0.62, 1],
          ease: CAMERA_EASE,
        }}
      />
    </motion.section>
  );
};

export default OceanDiveIntro;
