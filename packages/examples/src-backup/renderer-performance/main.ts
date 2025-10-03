// import './naive';
// import './naive-multi-material';
// import './cached-material';
import './cached-material-and-primitive';

// TODO: Remeasure all of them with a fixed screen size and power mode

// Default RenderPass (DepthPass + MultiMaterialPass)
// 40x40 | Single Material Mesh: Avg fps: 38
// 40x40 | Multi  Material Mesh: Avg fps: 10

// RenderPass without DepthPass (MultiMaterialPass only)
// 40x40 | Single Material Mesh: Avg fps: 50
// 40x40 | Multi  Material Mesh: Avg fps: 14
