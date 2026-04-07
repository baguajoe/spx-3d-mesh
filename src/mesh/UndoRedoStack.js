/**
 * SPX Undo/Redo Stack
 * Command pattern — every geo operation is undoable
 */
export class UndoRedoStack {
  constructor(maxSize = 100) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxSize   = maxSize;
    this.listeners = [];
  }

  // Push a command { name, undo, redo }
  push(name, undo, redo) {
    this.undoStack.push({ name, undo, redo });
    if (this.undoStack.length > this.maxSize) this.undoStack.shift();
    this.redoStack = []; // clear redo on new action
    this._notify();
  }

  // Push a geo state snapshot (positions array)
  pushGeoState(mesh, name = "Geometry Edit") {
    if (!mesh?.geometry?.attributes?.position) return;
    const pos    = mesh.geometry.attributes.position;
    const before = new Float32Array(pos.array);
    const undo   = () => {
      pos.array.set(before);
      pos.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    };
    const redo = () => {}; // will be filled on next push
    this.push(name, undo, redo);
  }

  // Push transform state
  pushTransform(mesh, name = "Transform") {
    const before = {
      px: mesh.position.x, py: mesh.position.y, pz: mesh.position.z,
      rx: mesh.rotation.x, ry: mesh.rotation.y, rz: mesh.rotation.z,
      sx: mesh.scale.x,    sy: mesh.scale.y,    sz: mesh.scale.z,
    };
    const undo = () => {
      mesh.position.set(before.px, before.py, before.pz);
      mesh.rotation.set(before.rx, before.ry, before.rz);
      mesh.scale.set(before.sx, before.sy, before.sz);
    };
    this.push(name, undo, () => {});
  }

  undo() {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;
    cmd.undo?.();
    this.redoStack.push(cmd);
    this._notify();
    return cmd.name;
  }

  redo() {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;
    cmd.redo?.();
    this.undoStack.push(cmd);
    this._notify();
    return cmd.name;
  }

  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }
  undoName(){ return this.undoStack[this.undoStack.length-1]?.name; }
  redoName(){ return this.redoStack[this.redoStack.length-1]?.name; }
  history() { return this.undoStack.map(c=>c.name); }
  clear()   { this.undoStack=[]; this.redoStack=[]; this._notify(); }

  onChange(fn) { this.listeners.push(fn); }
  _notify() { this.listeners.forEach(fn=>fn({ canUndo:this.canUndo(), canRedo:this.canRedo(), undoName:this.undoName(), redoName:this.redoName() })); }
}
