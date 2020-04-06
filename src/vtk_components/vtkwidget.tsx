
import React from 'react';

//@ts-ignore
import vtkFullScreenRenderWindow from "vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow";
//@ts-ignore
import vtkActor from "vtk.js/Sources/Rendering/Core/Actor";
//@ts-ignore
import vtkSphereSource from "vtk.js/Sources/Filters/Sources/SphereSource";
//@ts-ignore
import vtkMapper from "vtk.js/Sources/Rendering/Core/Mapper";
//@ts-ignore
import vtkDataArray from "vtk.js/Sources/Common/Core/DataArray";
//@ts-ignore
import vtkColorTransferFunction from "vtk.js/Sources/Rendering/Core/ColorTransferFunction";
//@ts-ignore
import vtkXMLPolyDataReader from "vtk.js/Sources/IO/XML/XMLPolyDataReader";
//@ts-ignore
import vtk from 'vtk.js/Sources/vtk';
import {
  ColorMode,
  ScalarMode,
  //@ts-ignore
} from 'vtk.js/Sources/Rendering/Core/Mapper/Constants';
//@ts-ignore
import vtkColorMaps from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction/ColorMaps';
//@ts-ignore
import vtkOrientationMarkerWidget from 'vtk.js/Sources/Interaction/Widgets/OrientationMarkerWidget';
//@ts-ignore
import vtkAxesActor from 'vtk.js/Sources/Rendering/Core/AxesActor';
//@ts-ignore
import vtkInteractiveOrientationWidget from 'vtk.js/Sources/Widgets/Widgets3D/InteractiveOrientationWidget';
//@ts-ignore
import vtkWidgetManager from 'vtk.js/Sources/Widgets/Core/WidgetManager';
//@ts-ignore
import * as vtkMath from 'vtk.js/Sources/Common/Core/Math';
//@ts-ignore
import readPolyDataArrayBuffer from 'itk/readPolyDataArrayBuffer';



function majorAxis(vec3: Array<number>, idxA: number, idxB: number) {
  const axis = [0, 0, 0];
  const idx = Math.abs(vec3[idxA]) > Math.abs(vec3[idxB]) ? idxA : idxB;
  const value = vec3[idx] > 0 ? 1 : -1;
  axis[idx] = value;
  return axis;
}

const resultPreprocessor =  ({ webWorker , polyData  }: any) => {
  webWorker.terminate();
  return polyData;
};

const getFileExt = (fileName: string) => {
  let a = fileName.split(".");
  if( a.length === 1 || ( a[0] === "" && a.length === 2 ) ) {
      return "";
  } 
  const ext = a.pop()
  if (ext) {
    return ext.toLowerCase(); 
  } else {
    return ""
  }
}

export default class VtkWidget extends React.Component<{}, {colorOption : any}> {

  fullScreenRenderer: any;
  renderer: any;
  source: any;
  renderWindow: any;
  mapper: any;
  container: any;
  dataRange: any;
  activeArray: any;
  lookupTable: any;
  actor: any;
  SUPPORTED_FILE :any
  constructor(props :any) {
    super(props);
    this.fullScreenRenderer = null;
    this.renderer = null;
    this.source = null
    this.renderWindow = null;
    this.mapper = null
    this.container = React.createRef();
    this.state = { colorOption: [] };
    this.dataRange = null
    this.activeArray = null
    this.lookupTable = null
    this.actor = null
    this.SUPPORTED_FILE = ["vtp", "vtu"]
  }

  createPipeline = (fileName: string, fileContents :any) => {
    // Create UI

    // VTK pipeline

    this.lookupTable = vtkColorTransferFunction.newInstance();
    
    readPolyDataArrayBuffer(null, fileContents, fileName).then(resultPreprocessor)
    .then((polyData :any) => {
      this.source = vtk(polyData);
      this.mapper = vtkMapper.newInstance({
        interpolateScalarsBeforeMapping: false,
        useLookupTableScalarRange: true,
        lookupTable: this.lookupTable,
        scalarVisibility: false
      });
      const actor = vtkActor.newInstance();
      this.actor = actor
      const scalars = this.source.getPointData().getScalars();
      this.dataRange = [].concat(scalars ? scalars.getRange() : [0, 1]);
      this.activeArray = vtkDataArray;
  
      const colorByOptions = [{ value: ":", label: "Solid color" }].concat(
        this.source
          .getPointData()
          .getArrays()
          .map((a:any) => ({
            label: `(p) ${a.getName()}`,
            value: `PointData:${a.getName()}`
          })),
          this.source
          .getCellData()
          .getArrays()
          .map((a:any) => ({
            label: `(c) ${a.getName()}`,
            value: `CellData:${a.getName()}`
          }))
      );
  
  
      this.setState(state => {
        return { colorOption: colorByOptions };
      });
  
      // --------------------------------------------------------------------
      // Pipeline handling
      // --------------------------------------------------------------------
  
      actor.setMapper(this.mapper);
      this.mapper.setInputData(this.source);
      this.renderer.addActor(actor);
  
      // Manage update when lookupTable change
      this.lookupTable.onModified(() => {
        this.renderWindow.render();
      });
  
      // First render
      this.renderer.resetCamera();
      this.renderWindow.render();



    });
  

  };

  updateColorBy = (event: any) => {
    
     
    
    const [location, colorByArrayName] = event.target.value.split(':');
    const interpolateScalarsBeforeMapping = location === 'PointData';
    let colorMode = ColorMode.DEFAULT;
    let scalarMode = ScalarMode.DEFAULT;
    const scalarVisibility = location.length > 0;
    if (scalarVisibility) {
      const newArray = this.source[`get${location}`]().getArrayByName(
        colorByArrayName
      );
      
      this.activeArray = newArray;
      const newDataRange = this.activeArray.getRange();
      this.dataRange[0] = newDataRange[0];
      this.dataRange[1] = newDataRange[1];
      colorMode = ColorMode.MAP_SCALARS;
      scalarMode =
        location === 'PointData'
          ? ScalarMode.USE_POINT_FIELD_DATA
          : ScalarMode.USE_CELL_FIELD_DATA;

      const numberOfComponents = this.activeArray.getNumberOfComponents();
      if (numberOfComponents > 1) {
        // always start on magnitude setting
        if (this.mapper.getLookupTable()) {
          const lut = this.mapper.getLookupTable();
          lut.setVectorModeToMagnitude();
        }
      } 
    } 
    this.mapper.set({
      colorByArrayName,
      colorMode,
      interpolateScalarsBeforeMapping,
      scalarMode,
      scalarVisibility,
    });
    this.applyPreset();
  }
 
   applyPreset =() => {
    const preset = vtkColorMaps.getPresetByName("rainbow");
    this.lookupTable.applyColorMap(preset);
    this.lookupTable.setMappingRange(this.dataRange[0], this.dataRange[1]);
    this.lookupTable.updateRange();
    }
  
  componentDidMount() {
    console.log("call render");
    setTimeout(() => {
      
      this.fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        background: [0.2, 0.3, 0.4],
        container: this.container.current,
        rootContainer  : this.container.current
      });
      this.renderer = this.fullScreenRenderer.getRenderer();
      this.renderWindow = this.fullScreenRenderer.getRenderWindow();
  
      const axes = vtkAxesActor.newInstance();
      const orientationWidget = vtkOrientationMarkerWidget.newInstance({
        actor: axes,
        interactor: this.renderWindow.getInteractor(),
      });
      orientationWidget.setEnabled(true);
      orientationWidget.setViewportCorner(
        vtkOrientationMarkerWidget.Corners.BOTTOM_LEFT
      );
      orientationWidget.setViewportSize(0.15);
      orientationWidget.setMinPixelSize(100);
      orientationWidget.setMaxPixelSize(300);
      
      const camera = this.renderer.getActiveCamera();
      const widgetManager = vtkWidgetManager.newInstance();
      widgetManager.setRenderer(orientationWidget.getRenderer());
      
      const widget = vtkInteractiveOrientationWidget.newInstance();
      widget.placeWidget(axes.getBounds());
      widget.setBounds(axes.getBounds());
      widget.setPlaceFactor(1);
      
      const vw = widgetManager.addWidget(widget);
      
      // Manage user interaction
      vw.onOrientationChange(({ up , direction, action, event }: any) => {
        const focalPoint = camera.getFocalPoint();
        const position = camera.getPosition();
        const viewUp = camera.getViewUp();
      
        const distance = Math.sqrt(
          vtkMath.distance2BetweenPoints(position, focalPoint)
        );
        camera.setPosition(
          focalPoint[0] + direction[0] * distance,
          focalPoint[1] + direction[1] * distance,
          focalPoint[2] + direction[2] * distance
        );
      
        if (direction[0]) {
          camera.setViewUp(majorAxis(viewUp, 1, 2));
        }
        if (direction[1]) {
          camera.setViewUp(majorAxis(viewUp, 0, 2));
        }
        if (direction[2]) {
          camera.setViewUp(majorAxis(viewUp, 0, 1));
        }
      
        orientationWidget.updateMarkerOrientation();
        widgetManager.enablePicking();
        this.renderWindow.render();
      });


      this.renderer.resetCamera();
      widgetManager.enablePicking();
      this.renderWindow.render();

    }, 500);
  }


  readDataSet = (fileName: string, result: any) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(result,"text/xml");
    const collection = xmlDoc.getElementsByTagName("Collection")
    console.log(collection);
  }

  loadFile = (file:any) => {

    const reader = new FileReader();
    const ext = getFileExt(file.name)
    let mode: number
    reader.onload = e => {
      console.log(file);
      
      if (mode === 1) {
        this.createPipeline(file.name, reader.result);
      } else if (mode === 0) {
        this.readDataSet(file.name, reader.result);
      }
    };
    if (this.SUPPORTED_FILE.includes(ext)) {
      reader.readAsArrayBuffer(file);
      mode = 1
    } else if (ext === "pvd") {
      reader.readAsText(file)
      mode = 0
    }
  };

  updateRepresentation = (event:any) =>{
    const [
      visibility,
      representation,
      edgeVisibility,
    ] = event.target.value.split(':').map(Number);
    this.actor.getProperty().set({ representation, edgeVisibility });
    this.actor.setVisibility(!!visibility);
    this.renderWindow.render();
}
  
  componentDidUpdate(prevProps: any) {}

  render() {
    return (
      <div style={{ height: "100%", width: "100%" }}>
        <div style={{ height: "95%", width: "100%" }} ref={this.container} />
        <div style={{ height: "5%", width: "100%" }}>
          <input
            type="file"
            //@ts-ignore
            onChange={e => this.loadFile(e.target.files[0])}
          ></input>
          <select onChange = {e => this.updateColorBy(e)}>
            {this.state.colorOption.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select onChange = {e => this.updateRepresentation(e)} >
            { [
              {label:'Surface',value:"1:2:0"},
              {label: 'Hidden',value: "0:-1:0"},
              {label:'Points',value:"1:0:0"},
              {label:'Wireframe',value:"1:1:0"},
              {label:'Surface with Edge',value:"1:2:1"}
            ].map((option, idx) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))
              
          }
          </select>
          <button onClick = {()=>{}}>Play</button>
        </div>
      </div>
    );
  }
}