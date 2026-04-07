/**
 * SPX Pose Presets
 * T-pose, A-pose, rest, action poses for humanoid rigs
 */
import * as THREE from "three";

// Bone rotations in radians [rx, ry, rz]
export const POSE_PRESETS = {
  "T-Pose": {
    description: "Standard T-pose — arms horizontal",
    bones: {
      "hips":       [0, 0, 0],
      "spine":      [0, 0, 0],
      "chest":      [0, 0, 0],
      "upper_arm.L":[ 0, 0,  1.57],  // 90° out
      "upper_arm.R":[ 0, 0, -1.57],
      "forearm.L":  [ 0, 0,  0],
      "forearm.R":  [ 0, 0,  0],
      "thigh.L":    [ 0, 0,  0],
      "thigh.R":    [ 0, 0,  0],
      "shin.L":     [ 0, 0,  0],
      "shin.R":     [ 0, 0,  0],
    }
  },
  "A-Pose": {
    description: "A-pose — arms at 45°",
    bones: {
      "upper_arm.L":[ 0, 0,  0.78],
      "upper_arm.R":[ 0, 0, -0.78],
      "forearm.L":  [ 0, 0,  0],
      "forearm.R":  [ 0, 0,  0],
      "thigh.L":    [ 0, 0,  0.05],
      "thigh.R":    [ 0, 0, -0.05],
    }
  },
  "Idle Stand": {
    description: "Natural standing idle",
    bones: {
      "hips":       [ 0,    0,    0   ],
      "spine":      [ 0.05, 0,    0   ],
      "upper_arm.L":[ 0.1,  0,    0.3 ],
      "upper_arm.R":[ 0.1,  0,   -0.3 ],
      "forearm.L":  [ 0.2,  0,    0   ],
      "forearm.R":  [ 0.2,  0,    0   ],
      "thigh.L":    [ 0,    0,    0.03],
      "thigh.R":    [ 0,    0,   -0.03],
    }
  },
  "Walk Pose": {
    description: "Mid-stride walk",
    bones: {
      "hips":       [ 0,    0.1,  0   ],
      "upper_arm.L":[ 0.6,  0,    0.2 ],
      "upper_arm.R":[-0.4,  0,   -0.2 ],
      "forearm.L":  [ 0.3,  0,    0   ],
      "forearm.R":  [ 0.5,  0,    0   ],
      "thigh.L":    [-0.5,  0,    0   ],
      "thigh.R":    [ 0.4,  0,    0   ],
      "shin.L":     [ 0.3,  0,    0   ],
      "shin.R":     [ 0.1,  0,    0   ],
    }
  },
  "Run Pose": {
    description: "Sprint stride",
    bones: {
      "hips":       [ 0.1,  0.1,  0   ],
      "spine":      [ 0.2,  0,    0   ],
      "upper_arm.L":[ 1.0,  0,    0.3 ],
      "upper_arm.R":[-0.8,  0,   -0.3 ],
      "forearm.L":  [ 0.8,  0,    0   ],
      "forearm.R":  [ 0.6,  0,    0   ],
      "thigh.L":    [-1.0,  0,    0   ],
      "thigh.R":    [ 0.7,  0,    0   ],
      "shin.L":     [ 0.8,  0,    0   ],
      "shin.R":     [ 0.2,  0,    0   ],
    }
  },
  "Sit": {
    description: "Seated position",
    bones: {
      "hips":       [-0.1,  0,    0   ],
      "spine":      [ 0.1,  0,    0   ],
      "thigh.L":    [ 1.5,  0,    0.1 ],
      "thigh.R":    [ 1.5,  0,   -0.1 ],
      "shin.L":     [-1.5,  0,    0   ],
      "shin.R":     [-1.5,  0,    0   ],
      "upper_arm.L":[ 0.1,  0,    0.4 ],
      "upper_arm.R":[ 0.1,  0,   -0.4 ],
    }
  },
  "Jump": {
    description: "Peak of jump",
    bones: {
      "hips":       [-0.2,  0,    0   ],
      "spine":      [-0.1,  0,    0   ],
      "upper_arm.L":[-0.5,  0,    0.8 ],
      "upper_arm.R":[-0.5,  0,   -0.8 ],
      "forearm.L":  [-0.3,  0,    0   ],
      "forearm.R":  [-0.3,  0,    0   ],
      "thigh.L":    [ 0.6,  0,    0.1 ],
      "thigh.R":    [ 0.6,  0,   -0.1 ],
      "shin.L":     [-0.8,  0,    0   ],
      "shin.R":     [-0.8,  0,    0   ],
    }
  },
  "Combat Stance": {
    description: "Fighting ready position",
    bones: {
      "hips":       [ 0,    0.2,  0   ],
      "spine":      [ 0.1,  0.1,  0   ],
      "upper_arm.L":[ 0.3,  0,    0.8 ],
      "upper_arm.R":[ 0.3,  0,   -0.4 ],
      "forearm.L":  [ 1.0,  0,    0   ],
      "forearm.R":  [ 0.5,  0,    0   ],
      "thigh.L":    [ 0.3,  0,    0.3 ],
      "thigh.R":    [ 0.1,  0,   -0.2 ],
      "shin.L":     [-0.5,  0,    0   ],
      "shin.R":     [-0.2,  0,    0   ],
    }
  },
  "Wave": {
    description: "Wave hello",
    bones: {
      "upper_arm.R":[-0.8,  0,   -1.2 ],
      "forearm.R":  [-0.5,  0.3,  0   ],
      "hand.R":     [ 0.3,  0.3,  0   ],
      "upper_arm.L":[ 0.1,  0,    0.3 ],
    }
  },
  "Point": {
    description: "Pointing forward",
    bones: {
      "upper_arm.R":[ 0,    0,   -0.8 ],
      "forearm.R":  [ 0,    0,    0   ],
      "hand.R":     [ 0,    0,   -0.3 ],
    }
  },
  "Crouch": {
    description: "Low crouch",
    bones: {
      "hips":       [ 0.5,  0,    0   ],
      "spine":      [-0.3,  0,    0   ],
      "thigh.L":    [ 1.2,  0,    0.1 ],
      "thigh.R":    [ 1.2,  0,   -0.1 ],
      "shin.L":     [-1.5,  0,    0   ],
      "shin.R":     [-1.5,  0,    0   ],
    }
  },
  "Death": {
    description: "Fallen/death pose",
    bones: {
      "hips":       [ 1.57, 0,    0   ],
      "spine":      [ 0.1,  0,    0   ],
      "upper_arm.L":[ 0.3,  0,    1.2 ],
      "upper_arm.R":[-0.2,  0,   -0.8 ],
      "thigh.L":    [ 0.3,  0,    0.2 ],
      "thigh.R":    [-0.2,  0,   -0.1 ],
    }
  },
};

export const POSE_CATEGORIES = {
  "Standard":  ["T-Pose","A-Pose","Idle Stand"],
  "Locomotion":["Walk Pose","Run Pose","Jump","Crouch"],
  "Action":    ["Combat Stance","Wave","Point","Death"],
  "Seated":    ["Sit"],
};

// Apply pose to an armature
export function applyPose(armature, poseName) {
  const pose = POSE_PRESETS[poseName];
  if (!pose || !armature?.bones) return;
  armature.bones.forEach(bone => {
    const rot = pose.bones[bone.name];
    if (rot) bone.rotation.set(rot[0], rot[1], rot[2]);
  });
}
