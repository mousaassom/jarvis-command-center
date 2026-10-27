import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

type HelmetSceneProps = {
  paused: boolean
  scanning: boolean
}

function createProceduralHelmet() {
  const root = new THREE.Group()
  const red = new THREE.MeshPhysicalMaterial({ color: '#9f101d', metalness: 0.82, roughness: 0.25, clearcoat: 0.8 })
  const gold = new THREE.MeshPhysicalMaterial({ color: '#d6a62e', metalness: 0.88, roughness: 0.22 })
  const dark = new THREE.MeshStandardMaterial({ color: '#101719', metalness: 0.65, roughness: 0.4 })
  const glow = new THREE.MeshStandardMaterial({ color: '#b9f4ff', emissive: '#32c5ff', emissiveIntensity: 1.8 })
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], scale: [number, number, number] = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...position)
    mesh.scale.set(...scale)
    root.add(mesh)
    return mesh
  }
  add(new THREE.SphereGeometry(1, 48, 32), red, [0, 0.15, 0], [0.88, 1.08, 0.82])
  add(new THREE.BoxGeometry(1.15, 1.28, 0.18, 4, 4, 1), gold, [0, -0.1, 0.72])
  add(new THREE.BoxGeometry(1.35, 0.2, 0.25), red, [0, 0.55, 0.72])
  add(new THREE.BoxGeometry(0.68, 0.42, 0.24), gold, [0, -0.86, 0.58])
  add(new THREE.BoxGeometry(0.37, 0.07, 0.05), glow, [-0.3, 0.23, 0.84])
  add(new THREE.BoxGeometry(0.37, 0.07, 0.05), glow, [0.3, 0.23, 0.84])
  add(new THREE.BoxGeometry(0.1, 0.5, 0.12), dark, [0, -0.28, 0.85])
  add(new THREE.CylinderGeometry(0.24, 0.24, 0.22, 24), dark, [-0.86, -0.05, 0], [1, 1, 1]).rotation.z = Math.PI / 2
  add(new THREE.CylinderGeometry(0.24, 0.24, 0.22, 24), dark, [0.86, -0.05, 0], [1, 1, 1]).rotation.z = Math.PI / 2
  root.scale.setScalar(1.15)
  return root
}

export function HelmetScene({ paused, scanning }: HelmetSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(paused)
  const scanningRef = useRef(scanning)
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')

  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => { scanningRef.current = scanning }, [scanning])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let disposed = false
    let frame = 0
    let renderer: THREE.WebGLRenderer | null = null
    let assetRoot: (THREE.Group & { dispose?: () => void | Promise<void> }) | null = null
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(0, 0.05, 4.4)
    const placement = new THREE.Group()
    const pointer = new THREE.Vector2()
    const clock = new THREE.Clock()

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8))
      renderer.setClearColor(0x000000, 0)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.15
      renderer.domElement.setAttribute('aria-label', 'Interactive red and gold JARVIS helmet')
      mount.appendChild(renderer.domElement)
    } catch {
      setStatus('fallback')
      return
    }

    scene.add(new THREE.HemisphereLight(0x8eefff, 0x250500, 2.2))
    const key = new THREE.DirectionalLight(0xffe2a1, 5.5)
    key.position.set(3, 3, 4)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x32c5ff, 5)
    rim.position.set(-4, 1, -2)
    scene.add(rim)
    const redRim = new THREE.PointLight(0xc10328, 20, 10)
    redRim.position.set(3, -1, 2)
    scene.add(redRim)
    scene.add(placement)

    const resize = () => {
      if (!renderer || !mount) return
      const { width, height } = mount.getBoundingClientRect()
      renderer.setSize(Math.max(width, 1), Math.max(height, 1), false)
      camera.aspect = Math.max(width, 1) / Math.max(height, 1)
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    resize()

    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 0.5
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.22
    }
    mount.addEventListener('pointermove', onPointerMove)

    const load = async () => {
      try {
        const manifest = await fetch('/helmet/manifest.json').then((response) => response.json())
        if (!manifest.available) {
          const fallback = createProceduralHelmet()
          assetRoot = fallback
          placement.add(fallback)
          setStatus('ready')
          return
        }
        const assetPath = '/helmet/asset.mjs'
        const { createAsset } = await import(/* @vite-ignore */ assetPath)
        if (disposed) return
        assetRoot = await createAsset(THREE, { states: 'lazy', sharedResources: false })
        if (disposed || !assetRoot) return
        assetRoot.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => {
            if (!(material instanceof THREE.MeshPhysicalMaterial)) return
            const slot = material.name
            if (slot === 'slot:body') {
              material.map = null
              material.color.set('#9f101d')
              material.metalness = 0.82
              material.roughness = 0.25
              material.clearcoat = 0.8
            } else if (slot === 'slot:trim') {
              material.map = null
              material.color.set('#d6a62e')
              material.metalness = 0.88
              material.roughness = 0.22
            } else if (slot === 'slot:glass') {
              material.map = null
              material.color.set('#071b23')
              material.emissive.set('#32c5ff')
              material.emissiveIntensity = 0.16
              material.metalness = 0.68
              material.roughness = 0.28
            }
            material.needsUpdate = true
          })
        })
        const centering = new THREE.Group()
        centering.add(assetRoot)
        placement.add(centering)
        assetRoot.updateMatrixWorld(true)
        const bounds = new THREE.Box3().setFromObject(assetRoot)
        const center = bounds.getCenter(new THREE.Vector3())
        const size = bounds.getSize(new THREE.Vector3())
        centering.position.copy(center).multiplyScalar(-1)
        const scale = 2.65 / Math.max(size.x, size.y, size.z)
        placement.scale.setScalar(scale)
        placement.rotation.x = 0.02
        setStatus('ready')
      } catch (error) {
        console.error('Helmet asset failed to load', error)
        if (!disposed) setStatus('fallback')
      }
    }
    load()

    const animate = () => {
      if (disposed || !renderer) return
      frame = requestAnimationFrame(animate)
      const delta = Math.min(clock.getDelta(), 0.05)
      if (!pausedRef.current) {
        placement.rotation.y += (pointer.x - placement.rotation.y) * 0.035
        placement.rotation.x += (-pointer.y - placement.rotation.x) * 0.035
        placement.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.025
        if (scanningRef.current) placement.rotation.y += delta * 0.5
      }
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      mount.removeEventListener('pointermove', onPointerMove)
      if (assetRoot) {
        placement.remove(assetRoot)
        assetRoot.dispose?.()
      }
      renderer?.dispose()
      renderer?.domElement.remove()
    }
  }, [])

  return (
    <div className={`helmet-scene ${scanning ? 'is-scanning' : ''}`}>
      <div className="helmet-fallback" aria-hidden={status !== 'fallback'}>
        <div className="fallback-core" />
      </div>
      <div ref={mountRef} className={`helmet-canvas ${status === 'ready' ? 'is-ready' : ''}`} />
      {status === 'loading' && <div className="helmet-loading"><span />INITIALIZING MARK VII</div>}
      {status === 'fallback' && <div className="helmet-loading">REACTOR VIEW · 3D UNAVAILABLE</div>}
    </div>
  )
}
