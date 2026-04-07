/**
 * SPX Node Wire System
 * SVG-based live wire drawing for all node editors
 * Works in NodeMaterialEditor, GeometryNodesPanel, CompositingPanel
 */

export class NodeWireSystem {
  constructor(svgEl) {
    this.svg    = svgEl;
    this.wires  = new Map(); // id → { from, to, path }
    this.draft  = null;      // in-progress wire
    this.nextId = 1;
  }

  // Get socket DOM position relative to SVG container
  _socketPos(socketEl) {
    if (!socketEl || !this.svg) return { x: 0, y: 0 };
    const sr = socketEl.getBoundingClientRect();
    const cr = this.svg.getBoundingClientRect();
    return {
      x: sr.left + sr.width  / 2 - cr.left,
      y: sr.top  + sr.height / 2 - cr.top,
    };
  }

  // Cubic bezier path string between two points
  _bezier(x1, y1, x2, y2) {
    const cx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1+cx} ${y1}, ${x2-cx} ${y2}, ${x2} ${y2}`;
  }

  // Start dragging a wire from an output socket
  startWire(fromSocketEl, fromId, color = "#00ffc8") {
    const pos = this._socketPos(fromSocketEl);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-dasharray", "4 2");
    path.setAttribute("opacity", "0.8");
    this.svg.appendChild(path);
    this.draft = { fromId, fromPos: pos, path, color };
  }

  // Update draft wire endpoint as mouse moves
  updateDraft(mouseX, mouseY) {
    if (!this.draft) return;
    const { fromPos, path } = this.draft;
    path.setAttribute("d", this._bezier(fromPos.x, fromPos.y, mouseX, mouseY));
  }

  // Complete wire connection to an input socket
  completeWire(toSocketEl, toId) {
    if (!this.draft) return null;
    const { fromId, fromPos, path, color } = this.draft;
    const toPos = this._socketPos(toSocketEl);
    path.setAttribute("d", this._bezier(fromPos.x, fromPos.y, toPos.x, toPos.y));
    path.removeAttribute("stroke-dasharray");
    const id = this.nextId++;
    this.wires.set(id, { fromId, toId, fromPos, toPos, path, color });
    this.draft = null;
    return { id, fromId, toId };
  }

  // Cancel draft wire
  cancelDraft() {
    if (this.draft) {
      this.svg.removeChild(this.draft.path);
      this.draft = null;
    }
  }

  // Remove a wire by id
  removeWire(id) {
    const wire = this.wires.get(id);
    if (wire) { this.svg.removeChild(wire.path); this.wires.delete(id); }
  }

  // Update all wires connected to a node (after node drag)
  updateNodeWires(nodeId, newPos) {
    this.wires.forEach((wire, id) => {
      if (wire.fromId === nodeId || wire.toId === nodeId) {
        // Recompute from DOM
        const path = this.svg.querySelector(`[data-wire="${id}"]`);
        if (path) path.setAttribute("d", this._bezier(wire.fromPos.x, wire.fromPos.y, wire.toPos.x, wire.toPos.y));
      }
    });
  }

  // Redraw all wires
  redrawAll(socketMap) {
    this.wires.forEach((wire, id) => {
      const fromEl = socketMap.get(wire.fromId);
      const toEl   = socketMap.get(wire.toId);
      if (fromEl && toEl) {
        const fp = this._socketPos(fromEl);
        const tp = this._socketPos(toEl);
        wire.fromPos = fp; wire.toPos = tp;
        wire.path.setAttribute("d", this._bezier(fp.x, fp.y, tp.x, tp.y));
      }
    });
  }

  clear() {
    this.wires.forEach(w => this.svg.removeChild(w.path));
    this.wires.clear();
    this.cancelDraft();
  }

  getConnections() {
    const out = [];
    this.wires.forEach((w, id) => out.push({ id, fromId: w.fromId, toId: w.toId }));
    return out;
  }
}
