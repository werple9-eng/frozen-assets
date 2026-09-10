import * as THREE from 'three';

// Module-lifetime assets may be used by several workshop previews/scenes.
// A renderer releases its GPU copies on disposal; a scene must not dispatch
// Material.dispose on an asset still used by another live renderer.
const shared = new WeakSet<object>();
export function sharedResource<T extends object>(resource: T): T {
  shared.add(resource);
  return resource;
}

export class SceneResources {
  private released = new WeakSet<object>();
  counts = { geometry: 0, material: 0, texture: 0, target: 0 };
  dispose(resource: THREE.BufferGeometry | THREE.Material | THREE.Texture | THREE.WebGLRenderTarget | null | undefined) {
    if (!resource || shared.has(resource) || this.released.has(resource)) return;
    this.released.add(resource);
    if (resource instanceof THREE.Material) {
      // Includes normal/roughness/emissive maps, not just the diffuse map.
      for (const value of Object.values(resource)) {
        if (value instanceof THREE.Texture) this.dispose(value);
      }
      if ('uniforms' in resource) {
        const uniforms = (resource as THREE.ShaderMaterial).uniforms;
        for (const uniform of Object.values(uniforms)) {
          const values = Array.isArray(uniform.value) ? uniform.value : [uniform.value];
          for (const value of values) if (value instanceof THREE.Texture) this.dispose(value);
        }
      }
      this.counts.material++;
    } else if (resource instanceof THREE.BufferGeometry) this.counts.geometry++;
    else if (resource instanceof THREE.Texture) this.counts.texture++;
    else this.counts.target++;
    resource.dispose();
  }
  disposeGraph(root: THREE.Object3D) {
    root.traverse((object) => {
      const drawable = object as THREE.Mesh | THREE.Points | THREE.Line | THREE.Sprite;
      // Sprite's quad is a Three.js module singleton, not scene-owned.
      if (!(drawable instanceof THREE.Sprite) && 'geometry' in drawable)
        this.dispose(drawable.geometry);
      if ('material' in drawable) {
        for (const material of Array.isArray(drawable.material) ? drawable.material : [drawable.material])
          this.dispose(material);
      }
      if (object instanceof THREE.Light && 'shadow' in object) {
        const shadow = (object as THREE.DirectionalLight).shadow;
        this.dispose(shadow.map);
        this.dispose(shadow.mapPass);
      }
    });
    if (root instanceof THREE.Scene) {
      if (root.background instanceof THREE.Texture) this.dispose(root.background);
      this.dispose(root.environment);
    }
  }
}
