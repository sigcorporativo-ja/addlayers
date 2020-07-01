import AddLayers from 'facade/addlayers';

const map = M.map({
  container: 'mapjs',
});

const mp = new AddLayers({
  position: 'TR',
});

map.addPlugin(mp);
