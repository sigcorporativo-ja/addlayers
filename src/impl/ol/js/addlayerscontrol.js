/**
 * @module M/impl/control/AddLayersControl
 */
export default class AddLayersControl extends M.impl.Control {
  /**
   * This function adds the control to the specified map
   *
   * @public
   * @function
   * @param {M.Map} map to add the plugin
   * @param {HTMLElement} html of the plugin
   * @api stable
   */
  addTo(map, html) {
    this.facadeMap = map;
    this.element = html;
    const olMap = map.getMapImpl();
    ol.control.Control.call(this, {
      element: html,
      target: null,
    });
    olMap.addControl(this);

    super.addTo(map, html);
  }

  /**
   * This function adds a GeoJSON layer
   * @public
   * @function
   * @api
   * @param {any} layerName
   * @param {any} source
   * @memberof AddLayersControl
   */
  loadGeoJSONLayer(layerName, originalSource) {
    return new Promise((resolve) => {
      let newSource;
      if (typeof originalSource === 'string') {
        newSource = JSON.parse(originalSource);
      } else {
        newSource = originalSource;
      }
      const layer = new M.layer.GeoJSON({
        name: layerName,
        source: newSource,
      });
      // compatibilidad con managelayers
      layer.options.origen = 'Local';
      layer.on(M.evt.LOAD, () => {
        resolve(layer.getFeatures());
      });
      this.facadeMap.addLayers(layer);
      /*
      setTimeout(() => {
        if (layer.getImpl() !== null) {
          this.facadeMap.setBbox(layer.getImpl().getOL3Layer().getSource().getExtent());
        }
      }, 1000);
      */
    });
  }

  /**
   * This function adds a KML layer
   * @public
   * @function
   * @api
   * @param {any} name
   * @param {any} source
   * @returns
   * @memberof AddLayersControl
   */
  loadKMLLayer(layerName, source, extractStyles) {
    /*     let layer = new M.layer.KML({
          name: layerName,
          url: url,
          extract: true
        });
        this.facadeMap.addLayers(layer);
        return layer.getFeatures(); */

    // FIXME: Es necesario usar la libreria base para leer las features
    // y crear a partir de ellas una capa GeoJSON
    let features = new ol.format.KML({ extractStyles })
      .readFeatures(source, { featureProjection: this.facadeMap.getProjection().code });
    features = this.convertToMFeature(features);
    this.createLayer(layerName, features);
    return features;
  }


  /**
   * This function adds a GPX layer
   * @public
   * @function
   * @api
   * @param {String} layerName
   * @param {any} source
   * @returns
   * @memberof AddLayersControl
   */
  loadGPXLayer(layerName, source) {
    // FIXME: Es necesario usar la libreria base para leer las features
    // y crear a partir de ellas una capa GeoJSON
    return new Promise((resolve) => {
      let features = new ol.format.GPX()
        .readFeatures(source, { featureProjection: this.facadeMap.getProjection().code });
      features = this.convertToMFeature(features);

      const layer = new M.layer.Vector({
        name: layerName,
      }, {
        displayInLayerSwitcher: true,
      });
      // compatibilidad con managelayers
      layer.options = {
        origen: 'Local',
      };
      layer.addFeatures(features);
      // layer.options.origen = 'Local';

      layer.on(M.evt.LOAD, () => {
        resolve(layer.getFeatures());
      });

      this.facadeMap.addLayers(layer);
      // return features;
    });
  }

  /**
   * This function creates a vector layer and adds it to the map
   * @public
   * @function
   * @api
   * @param {String} layerName - new layer's name
   * @param {*} features - new layer's features
   */
  createLayer(layerName, features) {
    const layer = new M.layer.Vector({
      name: layerName,
    }, {
      displayInLayerSwitcher: true,
    });
    // compatibilidad con managelayers
    layer.options = {
      origen: 'Local',
    };
    layer.addFeatures(features);
    this.facadeMap.addLayers(layer);
  }

  /**
   * This function centers features
   * @public
   * @function
   * @api
   * @param {any} features
   * @memberof LocalLayersControl
   */
  centerFeatures(features) {
    if (!M.utils.isNullOrEmpty(features)) {
      const extent = M.impl.utils.getFeaturesExtent(features);
      this.facadeMap.getMapImpl().getView().fit(extent, { duration: 500, minResolution: 1 });
    }
  }

  /**
   * This function converts OpenLayers features to Mapea features
   * @public
   * @function
   * @api
   * @param {*} features - OpenLayers features
   */
  convertToMFeature(features) {
    if (features instanceof Array) {
      return features.map((olFeature) => {
        const feature = new M.Feature(olFeature.getId(), {
          geometry: {
            coordinates: olFeature.getGeometry().getCoordinates(),
            type: olFeature.getGeometry().getType(),
          },
          properties: olFeature.getProperties(),
        });
        feature.getImpl().getOLFeature().setStyle(olFeature.getStyle());
        return feature;
      });
    }
    return 'El parámetro introducido no es un array.';
  }

  activateClick(map) {
    this.dblClickInteraction.setActive(false);
  }

  deactivateClick(map) {
    this.dblClickInteraction.setActive(true);
  }
}
