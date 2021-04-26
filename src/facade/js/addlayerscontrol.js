/**
 * @module M/control/AddLayersControl
 */

import AddLayersImplControl from 'impl/addlayerscontrol';
import template from 'templates/addlayers';
import * as shp from 'shpjs';

export default class AddLayersControl extends M.Control {
  /**
   * @classdesc
   * Main constructor of the class. Creates a PluginControl
   * control
   *
   * @constructor
   * @extends {M.Control}
   * @api stable
   */
  constructor() {
    // 1. checks if the implementation can create PluginControl
    if (M.utils.isUndefined(AddLayersImplControl)) {
      M.exception('La implementación usada no puede crear controles AddLayersControl.');
    }
    // 2. implementation of this control
    const impl = new AddLayersImplControl();
    super(impl, 'AddLayers');

    /**
     * File types that work
     * @private
     * @api
     */
    this.accept = '.kml, .zip, .gpx, .geojson';
  }

  /**
   * This function creates some class properties
   * and adds events to inputs and buttons
   * @public
   * @function
   * @param {HTML} html
   * @api
   */
  addEvents(html) {
    const inputFile = html.querySelector('.form div.file > input');
    this.loadBtn = html.querySelector('.button > button.load');
    this.inputName = html.querySelector('.form div.name > input');
    this.inputCenter = html.querySelector('.form div.centerview > input');
    this.inputStyle = html.querySelector('.form div.extractstyle > input');
    this.extractstyleContainer = html.querySelector('.form div.extractstyle');

    inputFile.addEventListener('change', evt => this.changeFile(evt, inputFile.files[0]));
    this.loadBtn.addEventListener('click', evt => this.loadLayer());
    this.inputName.addEventListener('input', evt => this.changeName(evt));
  }

  /**
   * This function creates the view
   *
   * @public
   * @function
   * @param {M.Map} map to add the control
   * @api stable
   */
  createView(map) {
    return new Promise((success, fail) => {
      const html = M.template
        .compileSync(template, { vars: { accept: this.accept, centerview: this.centerview } });
      this.addEvents(html);
      success(html);
    });
  }

  /**
   *
   * Gets DOM element scaping special characters (invalid for CSS search)
   * @public
   * @function
   * @api
   * @param {any} target
   * @param {any} selector
   * @returns
   * @memberof AddLayersControl
   */
  getQuerySelectorScapeCSS(target, selector) {
    // eslint-disable-next-line no-undef
    return target.querySelector(CSS.escape(selector));
  }

  /**
   * This function checks if there's a file no bigger than the maximun size,
   * enables styles extraction for kml files and gives file name to new layer.
   * @public
   * @function
   * @api
   * @param {any} file
   * @memberof AddLayersControl
   */
  changeFile(evt, file) {
    this.file = file;
    // Writing and button disabled, name emptied
    this.inputName.value = '';
    this.inputName.disabled = true;
    this.loadBtn.disabled = true;
    if (!M.utils.isNullOrEmpty(file)) {
      if (file.size > 20971520) {
        M.dialog.info('El fichero seleccionado sobrepasa el máximo de 20 MB permitido.');
        this.file = null;
      } else {
        // For kml files, this enables styles extraction option
        // const fileExt = this.file.name.slice((this.file.name.lastIndexOf('.') - 1 >>> 0) + 2);
        // Hay capas que pueden venir con la extensión en mayúscula.
        // Se llama al método toLowerCase para que cambie la extensión a minúscula
        const fileExt = this.file.name.slice(this.file.name.lastIndexOf('.') + 1).toLowerCase();
        if (fileExt === 'kml') {
          this.extractstyleContainer.classList.remove('dnone');
        } else {
          this.extractstyleContainer.classList.add('dnone');
        }
        // File extension deleted and stablished as layer name
        this.inputName.value = file.name.replace(/\.[^/.]+$/, '');
        // Input writing enabled, loading button enabled
        this.inputName.disabled = false;
        this.loadBtn.disabled = false;
      }
    }
  }

  /**
   * This function disables/enables load button
   * @public
   * @function
   * @api
   * @param {Event} evt
   * @memberof AddLayersControl
   */
  changeName(evt) {
    const e = (evt || window.event);
    const itemTarget = e.target;
    this.loadBtn.disabled = (itemTarget.value.trim() === '');
  }

  /**
   * Centers map view on features
   * @public
   * @function
   * @api
   * @param {Features} features - layer features
   * @memberof AddLayersControl
   */
  centerFeatures(features) {
    if (!features.length) {
      M.dialog.info('No se han detectado geometrías en este fichero.');
    } else if (this.inputCenter.checked) {
      this.getImpl().centerFeatures(features);
    }
  }

  /**
   * This function loads layers
   * @function
   * @public
   * @api
   * @memberof AddLayersControl
   */
  loadLayer() {
    // Getting file extension
    // const fileExt = this.file.name.slice((this.file.name.lastIndexOf('.') - 1 >>> 0) + 2);
    // Hay capas que pueden venir con la extensión en mayúscula.
    // Se llama al método toLowerCase para que cambie la extensión a minúscula
    const fileExt = this.file.name.slice(this.file.name.lastIndexOf('.') + 1).toLowerCase();
    const fileReader = new FileReader();
    fileReader.addEventListener('load', (e) => {
      try {
        let features = [];
        if (fileExt === 'zip') {
          // In case it's a group of shapes, this captures geojson into array and unites features
          const geojsonArray = [].concat(shp.parseZip(fileReader.result));
          let localFeatures;
          geojsonArray.forEach((element, index) => {
            this.getImpl().loadGeoJSONLayer(this.inputName.value, element).then((result) => {
              localFeatures = result;
              if (localFeatures) {
                features = features.concat(localFeatures);
              }
              if (index === geojsonArray.length - 1) {
                this.centerFeatures(features);
              }
            });
          });
        } else if (fileExt === 'kml') {
          // Si se pudiese hacer por url sin usar el proxy que machaca el blob
          /* let url = URL.createObjectURL(new Blob([fileReader.result], {
            type: 'text/plain'
          }));
          features = this.getImpl().loadKMLLayer(this.inputName.value, url); */
          features = this.getImpl().loadKMLLayer(
            this.inputName.value,
            fileReader.result,
            this.inputStyle.checked,
          );
          // Se añade llamada a centerFeatures para que centre la capa si el checkbox está activado
          this.centerFeatures(features);
        } else if (fileExt === 'gpx') {
          this.getImpl().loadGPXLayer(this.inputName.value, fileReader.result)
            .then((result) => {
              this.centerFeatures(result);
            });
        } else if (fileExt === 'geojson') {
          this.getImpl().loadGeoJSONLayer(this.inputName.value, fileReader.result)
            .then((result) => {
              this.centerFeatures(result);
            });
        } else {
          M.dialog.error('Error al cargar el fichero.');
          return;
        }
      } catch (error) {
        M.dialog.error('Error al cargar el fichero. Compruebe que se trata del fichero correcto.');
      }
    });
    if ((this.accept.indexOf('.zip') > -1 && fileExt === 'zip')) {
      fileReader.readAsArrayBuffer(this.file);
    } else if ((this.accept.indexOf('.kml') > -1 && fileExt === 'kml') || (this.accept.indexOf('.gpx') > -1 && fileExt === 'gpx') ||
      (this.accept.indexOf('.geojson') > -1 && fileExt === 'geojson')) {
      fileReader.readAsText(this.file);
    } else {
      M.dialog.error(`No se ha insertado una extensión de archivo permitida. Las permitidas son: ${this.accept}`);
    }
  }

  /**
   * This function compares controls
   *
   * @public
   * @function
   * @param {M.Control} control to compare
   * @api stable
   */
  equals(control) {
    return control instanceof AddLayersControl;
  }
}
