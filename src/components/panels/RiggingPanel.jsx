import React, { useState } from "react";

const ARMATURE_OPS = [
  { label: "New Armature",          fn: "create_armature",    key: "" },
  { label: "Add Bone",              fn: "add_bone",           key: "" },
  { label: "Duplicate Bone",        fn: "duplicate_bone",     key: "Shift+D" },
  { label: "Extrude Bone",          fn: "extrude_bone",       key: "E" },
  { label: "Delete Bone",           fn: "delete_bone",        key: "X" },
  { label: "Subdivide Bone",        fn: "subdivide_bone",     key: "" },
  { label: "Split Bone",            fn: "split_bone",         key: "" },
  { label: "Merge Bones",           fn: "merge_bones",        key: "" },
  { label: "Symmetrize",            fn: "symmetrize_rig",     key: "" },
  { label: "Roll from View",        fn: "roll_from_view",     key: "" },
  { label: "Recalculate Roll",      fn: "recalc_roll",        key: "" },
  { label: "Align Bone to Axis",    fn: "align_bone_axis",    key: "" },
];

const POSE_OPS = [
  { label: "Enter Pose Mode",       fn: "enter_pose",         key: "Ctrl+Tab" },
  { label: "Reset Location",        fn: "pose_reset_loc",     key: "Alt+G" },
  { label: "Reset Rotation",        fn: "pose_reset_rot",     key: "Alt+R" },
  { label: "Reset Scale",           fn: "pose_reset_scale",   key: "Alt+S" },
  { label: "Reset All",             fn: "pose_reset_all",     key: "Alt+G Alt+R Alt+S" },
  { label: "Copy Pose",             fn: "copy_pose",          key: "Ctrl+C" },
  { label: "Paste Pose",            fn: "paste_pose",         key: "Ctrl+V" },
  { label: "Paste Flipped",         fn: "paste_pose_flipped", key: "Ctrl+Shift+V" },
  { label: "Push Pose",             fn: "push_pose",          key: "" },
  { label: "Relax Pose",            fn: "relax_pose",         key: "" },
  { label: "Breakdown",             fn: "pose_breakdown",     key: "" },
  { label: "Propagate",             fn: "pose_propagate",     key: "Alt+P" },
];

const IK_OPS = [
  { label: "Add IK Constraint",     fn: "ik_chain",           key: "" },
  { label: "Two-Bone IK",           fn: "ik_two_bone",        key: "" },
  { label: "Spline IK",             fn: "spline_ik",          key: "" },
  { label: "IK / FK Blend",         fn: "ikfk_blend",         key: "" },
  { label: "Clear IK",              fn: "clear_ik",           key: "Alt+I" },
  { label: "Copy IK Chain",         fn: "copy_ik",            key: "" },
  { label: "Add Pole Target",       fn: "add_pole_target",    key: "" },
  { label: "Bake IK to FK",         fn: "bake_ik_to_fk",      key: "" },
  { label: "Bake FK to IK",         fn: "bake_fk_to_ik",      key: "" },
];

const CONSTRAINT_OPS = [
  { label: "Copy Location",         fn: "const_copy_loc",     key: "" },
  { label: "Copy Rotation",         fn: "const_copy_rot",     key: "" },
  { label: "Copy Scale",            fn: "const_copy_scale",   key: "" },
  { label: "Copy Transforms",       fn: "const_copy_xform",   key: "" },
  { label: "Limit Location",        fn: "const_limit_loc",    key: "" },
  { label: "Limit Rotation",        fn: "const_limit_rot",    key: "" },
  { label: "Limit Scale",           fn: "const_limit_scale",  key: "" },
  { label: "Limit Distance",        fn: "const_limit_dist",   key: "" },
  { label: "Track To",              fn: "const_track_to",     key: "" },
  { label: "Locked Track",          fn: "const_locked_track", key: "" },
  { label: "Damped Track",          fn: "const_damped_track", key: "" },
  { label: "Floor",                 fn: "const_floor",        key: "" },
  { label: "Follow Path",           fn: "const_follow_path",  key: "" },
  { label: "Clamp To",              fn: "const_clamp_to",     key: "" },
  { label: "Stretch To",            fn: "const_stretch_to",   key: "" },
  { label: "Action",                fn: "const_action",       key: "" },
  { label: "Armature",              fn: "const_armature",     key: "" },
  { label: "Child Of",              fn: "const_child_of",     key: "" },
  { label: "Pivot",                 fn: "const_pivot",        key: "" },
  { label: "Shrinkwrap",            fn: "const_shrinkwrap",   key: "" },
];

const WEIGHT_OPS = [
  { label: "Heat Map Weights",      fn: "heat_weights",       key: "" },
  { label: "Envelope Weights",      fn: "envelope_weights",   key: "" },
  { label: "Empty Groups",          fn: "empty_weight_groups",key: "" },
  { label: "Paint Weights",         fn: "paint_weights",      key: "" },
  { label: "Normalize All",         fn: "norm_weights_all",   key: "" },
  { label: "Normalize Active",      fn: "norm_weights",       key: "" },
  { label: "Mirror Weights",        fn: "mirror_weights",     key: "" },
  { label: "Smooth Weights",        fn: "smooth_weights",     key: "" },
  { label: "Copy Weights",          fn: "copy_weights",       key: "" },
  { label: "Paste Weights",         fn: "paste_weights",      key: "" },
  { label: "Transfer Weights",      fn: "transfer_weights",   key: "" },
  { label: "Limit Total",           fn: "limit_weight_total", key: "" },
  { label: "Clean Zero Weights",    fn: "clean_zero_weights", key: "" },
];

const MOCAP_OPS = [
  { label: "Retarget MoCap",        fn: "mocap_retarget",     key: "" },
  { label: "Bake Animation",        fn: "mocap_bake",         key: "" },
  { label: "Import BVH",            fn: "import_bvh",         key: "" },
  { label: "Import FBX Anim",       fn: "import_fbx_anim",    key: "" },
  { label: "Clean Keyframes",       fn: "clean_keyframes",    key: "" },
  { label: "Reduce Keyframes",      fn: "reduce_keyframes",   key: "" },
  { label: "Sample Rate",           fn: "sample_keyframes",   key: "" },
];

function RigGroup({ title, ops, onAction, color }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="spx-rig-group">
      <button className={`spx-rig-group-hdr spx-rig-group-hdr--${color}`} onClick={() => setOpen(v => !v)}>
        <svg className={`spx-rig-chevron${open ? " spx-rig-chevron--open" : ""}`} viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
        <span>{title}</span>
        <span className="spx-rig-count">{ops.length}</span>
      </button>
      {open && (
        <div className="spx-rig-group-body">
          {ops.map(op => (
            <button key={op.fn} className="spx-rig-op-btn" onClick={() => onAction?.(op.fn)} title={op.key || ""}>
              <span className="spx-rig-op-label">{op.label}</span>
              {op.key && <span className="spx-rig-op-key">{op.key}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RiggingPanel({ onAction }) {
  const [rigMode, setRigMode] = useState("EDIT"); // EDIT | POSE | WEIGHT
  const [xMirror, setXMirror] = useState(true);
  const [autoIK,  setAutoIK]  = useState(false);
  const [boneEnvelopes, setBoneEnvelopes] = useState(false);

  return (
    <div className="spx-rig-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Rigging</span>
      </div>

      {/* Mode */}
      <div className="spx-rig-modes">
        {["EDIT","POSE","WEIGHT"].map(m => (
          <button
            key={m}
            className={`spx-rig-mode-btn${rigMode === m ? " spx-rig-mode-btn--active" : ""}`}
            onClick={() => setRigMode(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Options */}
      <div className="spx-rig-options">
        <button className={`spx-rig-opt-btn${xMirror ? " spx-rig-opt-btn--on" : ""}`} onClick={() => setXMirror(v => !v)}>X-Mirror</button>
        <button className={`spx-rig-opt-btn${autoIK ? " spx-rig-opt-btn--on" : ""}`} onClick={() => setAutoIK(v => !v)}>Auto IK</button>
        <button className={`spx-rig-opt-btn${boneEnvelopes ? " spx-rig-opt-btn--on" : ""}`} onClick={() => setBoneEnvelopes(v => !v)}>Envelopes</button>
      </div>

      {/* Groups */}
      <div className="spx-rig-groups">
        <RigGroup title="Armature"    ops={ARMATURE_OPS}   onAction={onAction} color="teal" />
        <RigGroup title="Pose"        ops={POSE_OPS}       onAction={onAction} color="blue" />
        <RigGroup title="IK"          ops={IK_OPS}         onAction={onAction} color="orange" />
        <RigGroup title="Constraints" ops={CONSTRAINT_OPS} onAction={onAction} color="purple" />
        <RigGroup title="Weights"     ops={WEIGHT_OPS}     onAction={onAction} color="green" />
        <RigGroup title="MoCap"       ops={MOCAP_OPS}      onAction={onAction} color="yellow" />
      </div>
    </div>
  );
}
