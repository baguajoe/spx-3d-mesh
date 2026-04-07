/**
 * SPX Plugin System
 * Third-party plugin support — register tools, panels, importers, exporters
 */

export class SPXPlugin {
  constructor(manifest) {
    this.id          = manifest.id;
    this.name        = manifest.name;
    this.version     = manifest.version || "1.0.0";
    this.author      = manifest.author  || "";
    this.description = manifest.description || "";
    this.enabled     = true;
    this._hooks      = new Map();
  }

  // Register a hook
  on(event, fn) {
    if (!this._hooks.has(event)) this._hooks.set(event, []);
    this._hooks.get(event).push(fn);
  }

  _trigger(event, ...args) {
    return this._hooks.get(event)?.map(fn=>fn(...args)) || [];
  }
}

export class PluginSystem {
  constructor(app) {
    this.app     = app;
    this.plugins = new Map();
    this.hooks   = new Map();
    this._panels  = [];
    this._tools   = [];
    this._importers= [];
    this._exporters= [];
  }

  // Register a plugin
  register(plugin) {
    if (!(plugin instanceof SPXPlugin)) {
      console.error("Plugin must extend SPXPlugin");
      return false;
    }
    this.plugins.set(plugin.id, plugin);
    console.log(`[SPX Plugins] Registered: ${plugin.name} v${plugin.version}`);
    this._trigger("plugin:registered", plugin);
    return true;
  }

  // Register a custom panel
  registerPanel(pluginId, panelDef) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;
    this._panels.push({ pluginId, ...panelDef });
    this._trigger("panel:registered", panelDef);
  }

  // Register a custom tool
  registerTool(pluginId, toolDef) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;
    this._tools.push({ pluginId, ...toolDef });
    this._trigger("tool:registered", toolDef);
  }

  // Register a file importer
  registerImporter(pluginId, importerDef) {
    this._importers.push({ pluginId, ...importerDef });
  }

  // Register a file exporter
  registerExporter(pluginId, exporterDef) {
    this._exporters.push({ pluginId, ...exporterDef });
  }

  // Global hook system
  hook(event, fn) {
    if (!this.hooks.has(event)) this.hooks.set(event, []);
    this.hooks.get(event).push(fn);
  }

  _trigger(event, ...args) {
    this.hooks.get(event)?.forEach(fn=>fn(...args));
    this.plugins.forEach(p=>p._trigger(event,...args));
  }

  // Trigger scene events
  onSceneUpdate(scene)  { this._trigger("scene:update",  scene);  }
  onSelect(mesh)        { this._trigger("select",        mesh);   }
  onDeselect()          { this._trigger("deselect");              }
  onRenderStart()       { this._trigger("render:start");          }
  onRenderComplete(img) { this._trigger("render:complete",img);   }
  onExport(format,data) { this._trigger("export",format,data);    }
  onImport(file,obj)    { this._trigger("import",file,obj);       }

  // Get all registered panels/tools for UI
  getPanels()   { return this._panels;   }
  getTools()    { return this._tools;    }
  getImporters(){ return this._importers;}
  getExporters(){ return this._exporters;}

  list() {
    return [...this.plugins.values()].map(p=>({
      id:p.id, name:p.name, version:p.version,
      author:p.author, enabled:p.enabled
    }));
  }

  enable(id)  { const p=this.plugins.get(id); if(p)p.enabled=true;  }
  disable(id) { const p=this.plugins.get(id); if(p)p.enabled=false; }
  unregister(id){ this.plugins.delete(id); }
}

// ── Example built-in plugins ─────────────────────────────────────────────────
export function registerBuiltinPlugins(pluginSystem) {
  // SPX Terrain plugin
  const terrainPlugin = new SPXPlugin({
    id:"spx-terrain", name:"SPX Terrain Pro", version:"1.0.0",
    author:"StreamPireX", description:"Advanced terrain generation tools",
  });
  terrainPlugin.on("scene:update", (scene) => { /* terrain auto-update */ });
  pluginSystem.register(terrainPlugin);

  // SPX Hair Groom plugin
  const hairPlugin = new SPXPlugin({
    id:"spx-hair-groom", name:"SPX Hair Groom", version:"1.0.0",
    author:"StreamPireX", description:"Advanced hair and fur grooming",
  });
  pluginSystem.register(hairPlugin);

  // SPX VFX plugin
  const vfxPlugin = new SPXPlugin({
    id:"spx-vfx", name:"SPX VFX Suite", version:"1.0.0",
    author:"StreamPireX", description:"Explosions, fire, destruction effects",
  });
  pluginSystem.register(vfxPlugin);
}
