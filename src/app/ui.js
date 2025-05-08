import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { Pane } from 'tweakpane';
import { BarkType, Billboard, LeafType, TreePreset, Tree, TreeType } from '@plant_dt';
import { Environment } from './environment';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { version } from '../../package.json';

const exporter = new GLTFExporter();
let pane = null;

/**
 * Setups the UI
 * @param {Tree} tree
 * @param {Environment} environment
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {OrbitControls} controls
 * @param {String} initialPreset
 */
export function setupUI(tree, environment, renderer, scene, camera, controls, initialPreset) {

  // Remove old event listener and dispose old pane
  pane?.off('change');
  pane?.dispose();

  pane = new Pane({ container: document.getElementById('ui-container'), title: 'Controls' });

  const onChange = () => {
    tree.generate();
    tree.traverse((o) => {
      if (o.material) {
        o.material.needsUpdate = true;
      }
    });
  };


  const tab = pane.addTab({
    pages: [
      { title: 'Parameters' },
      { title: '' }
    ]
  });

  const treeFolder = tab.pages[0].addFolder({ title: 'Tree', expanded: true });

  // Update tree and material on change
  treeFolder.on('change', onChange);

  // Preset dropdown
  treeFolder.addBlade({
    view: 'list',
    label: 'preset',
    options: Object.keys(TreePreset).map(p => ({ text: p, value: p })),
    value: initialPreset
  }).on('change', (e) => {
    tree.loadPreset(e.value)
    pane.refresh();
  });

  
  // Branch folder
  const branchFolder = treeFolder.addFolder({ title: 'Branches', expanded: false });

  //branchFolder.addBinding(tree.options, 'type', { options: TreeType });
  branchFolder.addBinding(tree.options.branch, 'levels', { min: 0, max: 3, step: 1 });


  const childrenFolder = branchFolder.addFolder({ title: 'Children', expanded: false });
  childrenFolder.addBinding(tree.options.branch.children, '0', { min: 0, max: 100, step: 1 });


  

  const lengthFolder = branchFolder.addFolder({ title: 'Length', expanded: false });
  lengthFolder.addBinding(tree.options.branch.length, '0', { min: 0.1, max: 100 });


  const branchRadiusFolder = branchFolder.addFolder({ title: 'Radius', expanded: false });
  branchRadiusFolder.addBinding(tree.options.branch.radius, '0', { min: 0.1, max: 5 });
  

  const leavesFolder = treeFolder.addFolder({ title: 'Leaves', expanded: false });
  
  leavesFolder.addBinding(tree.options.leaves, 'count', { min: 0, max: 100, step: 1 });

  leavesFolder.addBinding(tree.options.leaves, 'size', { min: 0, max: 10 });
  
  /** ENVIRONMENT */

  const environmentFolder = tab.pages[0].addFolder({ title: 'Environment', expanded: false });
  environmentFolder.addBinding(environment.skybox, 'sunAzimuth', { label: 'sunAngle', min: 0, max: 360 });
  environmentFolder.addBinding(environment.grass, 'instanceCount', { label: 'grassCount', min: 0, max: 25000, step: 1 });

  

  tab.pages[1].addButton({ title: 'Save Preset' }).on('click', () => {
    const link = document.getElementById('downloadLink');
    const json = JSON.stringify(tree.options, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    link.href = URL.createObjectURL(blob);
    link.download = 'tree.json';
    link.click();
  });

  tab.pages[1].addButton({ title: 'Load Preset' }).on('click', () => {
    document.getElementById('fileInput').click();
  });

  tab.pages[1].addButton({ title: 'Export GLB' }).on('click', () => {
    exporter.parse(
      tree,
      (glb) => {
        const blob = new Blob([glb], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const link = document.getElementById('downloadLink');
        link.href = url;
        link.download = 'tree.glb';
        link.click();
      },
      (err) => {
        console.error(err);
      },
      { binary: true }
    );
  });

  tab.pages[1].addButton({ title: 'Export PNG' }).on('click', () => {
    renderer.setClearColor(0, 0); // Set background to transparent

    // Disable fog
    const fog = scene.fog;
    scene.fog = null;

    // Hide all objects in the scene except for the tree
    scene.traverse((o) => {
      if (o.name === 'Skybox') {
        // Temporarily flip the skybox so it doesn't render
        o.material.side = THREE.FrontSide;
      } else if (o.isMesh) {
        o.visible = false
      }
    });
    tree.traverse((o) => o.visible = true);

    // Render the scene to texture
    renderer.render(scene, camera);

    const link = document.getElementById('downloadLink');
    link.href = renderer.domElement.toDataURL('image/png');
    link.download = 'tree.png';
    link.click();

    // Restore defaults
    renderer.setClearColor(0);
    scene.fog = fog;
    scene.traverse((o) => {
      if (o.name === 'Skybox') {
        o.material.side = THREE.BackSide;
      }
      o.visible = true;
    });
  });

  // Read tree parameters from JSON
  document
    .getElementById('fileInput')
    .addEventListener('change', function (event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          try {
            tree.options = JSON.parse(e.target.result);
            tree.generate();
            setupUI(tree, environment, renderer, scene, camera, controls, initialPreset)
          } catch (error) {
            console.error('Error parsing JSON:', error);
          }
        };
        reader.onerror = function (e) {
          console.error('Error reading file:', e);
        };
        reader.readAsText(file);
      }
    });
}
