/*  
This script was created by Christian Thomas of SkyTruth for the purpose of monitoring environmental incidents around the world. This version of
the script was finalized on 2017/07/06. This version is set up for no user interaction with the script; date range and position are both 
specified through the User Interface (UI). It provides users with the ability to search a variety of available satellite image sources:
    1. ESA - Sentinel 1
    2. ESA - Sentinel 2
    3. USGS - Landsat 7 * currently only RAW images, no TOA products.
    4. USGS - Landsat 8 * currently only RAW images, no TOA products.
    
Users are able to view all images in the above image collections for a specified date range, which intersect an AOI that is comprised of a
70,000 meters (70km) buffer of a specified center point by toggling the 'Image Collections'. Users may export a mosaic of  the image 
collections clipped to the AOI, they may also view all scenes which intersect the AOI by toggling the 'Specific Scenes', and may export any of 
these scenes by clicking the corresponding 'Export Prep' button, allowing exports to be run from the 'Tasks' bar.
*/

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//==================================================================== GLOBAL VARIABLE CREATION ======================================================================//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Create the collectionSelection outside the function that calls it, as null (empty), when the function is called
// it will append the the null variable!
var collectionTitlePanel = null;
var collectionSelection = null;

var sceneTitlePanel = null;
var sceneSelection = null;
var sceneSelection_clipped = null;

var sceneExportTitle = null;

var export_S1_button = null;
var export_S2_button = null;
var export_L7_button = null;
var export_L8_button = null;

var export_S1_clipped_button = null;
var export_S2_clipped_button = null;
var export_L7_clipped_button = null;
var export_L8_clipped_button = null;

var h1 = null; // Sentinel 1 Export Panel
var h2 = null; // Sentinel 2 Export Panel
var h3 = null; // Landsat 7 Export Panel
var h4 = null; // Landsat 8 Export Panel
var h5 = null;

var disclaimer = null;

// SPECIFY IMAGE COlLECTIONS
var S1 = ee.ImageCollection('COPERNICUS/S1_GRD');
var S2 = ee.ImageCollection('COPERNICUS/S2');
var L7 = ee.ImageCollection('LANDSAT/LE07/C01/T1_RT');
var L8 = ee.ImageCollection('LANDSAT/LC08/C01/T1_RT');

var s1Bands = 'VV';

// SET VISUAL PARAMETERS FOR DISPLAY
var S1_viz = {'bands': 'VV', 'min':-25, 'max':0};
var S2_viz = {'bands': ['B4', 'B3', 'B2'], 'min': 300, 'max': 3000, 'gamma': 1.0};
var L7_viz = {'bands': ['B3', 'B2', 'B1'], 'min': 0, 'max': 255, 'gamma': 1.6};
var L8_viz = {'bands': ['B4', 'B3', 'B2'], 'min': 6000, 'max': 15000, 'gamma': 1.6};

var Sentinel_1 = 'SENTINEL 1';
var Sentinel_2 = 'SENTINEL 2';
var Landsat_7 = 'LANDSAT 7';
var Landsat_8 = 'LANDSAT 8';


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//========================================= CREATE THE NESSECARY FUCNTIONS FOR DISPLAY, DATA PROCESSING, & UI CONFIGURATION ==========================================//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// This is a purely cosmetic function
function HorizontalPanel(widget_list) {
  return ui.Panel({
    widgets: widget_list,
    layout: ui.Panel.Layout.flow('horizontal'),
    style:{color:'ffffff', backgroundColor: '6799CD'}
  });
}
function inspect_onClick(coords) {
  var lon = coords.lon;
  var lat = coords.lat;
  showPosition_onClick(lon,lat);
}

function showPosition_onClick(lon,lat) {
  inspector.clear();
  var positionLabel = ui.Label('Position:  '+lon+' , '+lat);
  inspector.add(positionLabel);
}
// Apply Changes to the spatial/temporal parameters. Will re-sort the image collections and re-center the map. This is the BIG function, the script's ability to run is 
// largely dependent upon this, the parameter_onClick function.
function parameter_onClick() {
  map.clear();
  var long = parseFloat(lon.getValue());
  var lati = parseFloat(lat.getValue());
  
  var sd = startDate.getValue();
  var ed = endDate.getValue();

  var basicFilter = ee.Filter.and(ee.Filter.date(sd, ed));

  var centerPoint= ee.Geometry.Point([long,lati]);
  var aoi = centerPoint.buffer(70000);

  var s1_p = S1.filter(basicFilter).filter(ee.Filter.eq('transmitterReceiverPolarisation', s1Bands)).select(s1Bands).filter(ee.Filter.eq('resolution','H')).filterBounds(aoi);
  var s2_p = S2.filter(basicFilter).select(['B2','B3','B4']).filterBounds(aoi);
  var l7_p = L7.filter(basicFilter).select(['B1','B2','B3']).filterBounds(aoi);
  var l8_p = L8.filter(basicFilter).select(['B2','B3','B4']).filterBounds(aoi);  
  
  var s1_CollectionList = ee.List(s1_p.aggregate_array("system:index"));
  var s2_CollectionList = ee.List(s2_p.aggregate_array("system:index"));
  var l7_CollectionList = ee.List(l7_p.aggregate_array("system:index"));
  var l8_CollectionList = ee.List(l8_p.aggregate_array("system:index"));

  var s1_CollectionLength = s1_CollectionList.getInfo().length;
  var s2_CollectionLength = s2_CollectionList.getInfo().length;
  var l7_CollectionLength = l7_CollectionList.getInfo().length;
  var l8_CollectionLength = l8_CollectionList.getInfo().length;
  
  
  // If the collectionSelection has been previously declared, then remove it and recompute it. Else, just compute it!
  if (collectionSelection !== null){panel.remove(collectionSelection);}
  collectionSelection =  ui.Select({items:[Sentinel_1,Sentinel_2,Landsat_7,Landsat_8], onChange: redraw_onSelect, placeholder:'Select a Sensor',style:{color:'000000', backgroundColor: '6799CD'}});

  // If the collectionTitlePanel has already been created, remove it and recompute it. Else, compute it.
  if (collectionTitlePanel !== null){  panel.remove(collectionTitlePanel);}
  collectionTitlePanel = ui.Label('Image Collections:',{fontSize:'18px', fontWeight: 'bold', color:'000000', backgroundColor: '6799CD'});
  
  // If the sceneTitlePanel has already been created, remove it and recompute it. Else, compute it.
  if (sceneTitlePanel !== null){panel.remove(sceneTitlePanel);}
  sceneTitlePanel = HorizontalPanel([ui.Label('Specific Scenes:',{fontSize:'18px', fontWeight: 'bold', color:'000000', backgroundColor: '6799CD',padding:'0px 50px 0px 0px'}),
                    ui.Label('Clipped Scenes:',{fontSize:'18px', fontWeight: 'bold', color:'000000', backgroundColor: '6799CD'})]);
  
  
  
  // If the sceneSelection has already been created, remove it and recompute it. Else, compute it.
  if (sceneSelection !== null){panel.remove(sceneSelection);}
  sceneSelection = ui.Select({items:[Sentinel_1,Sentinel_2,Landsat_7,Landsat_8], onChange: sceneDisplay_onSelect, placeholder:'Select a Sensor', style:{
    color:'000000', 
    backgroundColor: '6799CD',
    padding:'0px 85px 0px 0px'
  }});
  
  // // If the sceneSelection_clipped has already been created, remove it and recompute it. Else, compute it.
  if (sceneSelection_clipped !== null){panel.remove(sceneSelection_clipped);}
  sceneSelection_clipped = ui.Select({
    items:[Sentinel_1,Sentinel_2,Landsat_7,Landsat_8], 
    onChange: sceneDisplay_clipped_onSelect, 
    placeholder:'Select a Sensor', 
    style:{
      color:'000000', 
      backgroundColor: '6799CD'
    }
  });
  if (h5 !== null){panel.remove(h5);}
  h5 = HorizontalPanel([sceneSelection,sceneSelection_clipped]);
  
  
  
  
  // If the sceneExportTitle has already been created, remove it and recompute it. Else, compute it.
  if (sceneExportTitle !== null){panel.remove(sceneExportTitle);}
  sceneExportTitle = HorizontalPanel([ui.Label('Prep Scene Exports:',{fontSize:'18px', fontWeight: 'bold', color:'000000', backgroundColor: '6799CD', padding: '0px 18px 0px 0px'}),
                                      ui.Label('Clipped Exports:',{fontSize:'18px', fontWeight: 'bold', color:'000000', backgroundColor: '6799CD'})]);

  // If the sceneExports has already been created, remove them and recompute them. Else, compute them.
  if (h1 !== null){panel.remove(h1);}
  h1 = (HorizontalPanel([ui.Button({label:'Sentinel 1 Export Prep', onClick: s1_export_onClick, style:{color:'000000', backgroundColor: '6799CD',padding:'0px 60px 0px 0px'}}),
                         ui.Button({label:'Sentinel 1 Export Prep', onClick: s1_export_clipped_onClick, style:{color:'000000', backgroundColor: '6799CD'}})]));
  
  if (h2 !== null){panel.remove(h2);}
  h2 = (HorizontalPanel([ui.Button({label:'Sentinel 2 Export Prep', onClick: s2_export_onClick, style:{color:'000000', backgroundColor: '6799CD',padding:'0px 60px 0px 0px'}}),
                         ui.Button({label:'Sentinel 2 Export Prep', onClick: s2_export_clipped_onClick, style:{color:'000000', backgroundColor: '6799CD'}})]));
  
  if (h3 !== null){panel.remove(h3);}
  h3 = (HorizontalPanel([ui.Button({label:'Landsat 7 Export Prep', onClick: l7_export_onClick, style:{color:'000000', backgroundColor: '6799CD',padding:'0px 60px 0px 0px'}}),
                         ui.Button({label:'Landsat 7 Export Prep', onClick: l7_export_clipped_onClick, style:{color:'000000', backgroundColor: '6799CD'}})]));
  
  if (h4 !== null){panel.remove(h4);}
  h4 = (HorizontalPanel([ui.Button({label:'Landsat 8 Export Prep', onClick: l8_export_onClick, style:{color:'000000', backgroundColor: '6799CD',padding:'0px 60px 0px 0px'}}),
                         ui.Button({label:'Landsat 8 Export Prep', onClick: l8_export_clipped_onClick, style:{color:'000000', backgroundColor: '6799CD'}})]));



  if (disclaimer !== null){panel.remove(disclaimer);}
  disclaimer = ui.Label('* Disclaimer: 1. There may be issues which arise when trying to export unclipped scenes. In this scenario, the maxPixel count will need to be changed '+
  'in the code itself. 2. Using large date ranges will likely slow the processing down. Try to keep the range restricted. 3. Clipped images will likey load and export more '+
  'quickly, given the option exporting the clipped scenes is preferred. 4. The export prep buttons do not run the exports, merely prepare them. To run the exports (they export '+
  'to Drive), you must expand the code editor, and click run in the Tasks tab. Please make Christian aware of any issues you encounter.',{fontSize:'12px',backgroundColor: '6799CD',
    position:'bottom-center', padding:'100px 0px 0px 0px',color:'000000'});

  // Re-Draw Image Collections on Change of Selection
  function redraw_onSelect() {
    map.layers().reset();

    var layer = collectionSelection.getValue();
    var image;
    var image_viz;
    var im_title;
    if (layer == Sentinel_1) {image = s1_p;image_viz = S1_viz;im_title='Sentinel 1';}
    else if (layer == Sentinel_2) {image = s2_p;image_viz = S2_viz;im_title='Sentinel 2';}
    else if (layer == Landsat_7) {image = l7_p;image_viz = L7_viz;im_title='Landsat 7';}
    else if (layer == Landsat_8) {image = l8_p;image_viz = L8_viz;im_title='Landsat 8';}

    map.addLayer(image, image_viz, im_title);
    map.addLayer(aoi,{color: 'FC6B00'},'AOI',false);
    map.addLayer(centerPoint, {color: 'F0FC00'}, 'Center Point', false);
  }

  // EXAMINE SPECIFIC SCENES FROM EACH SENSOR, RATHER THAN COLLECTIONS AS A WHOLE
  function sceneDisplay_onSelect() {
    map.layers().reset();
    var layer = sceneSelection.getValue();
    var image;
    var image_viz;
    var im_title;
    var exportTitle;
    var imScale;
    var test_title;
    if(layer == Sentinel_1){
      image = s1_p;
      image_viz = S1_viz;
      im_title='Sentinel 1';
      for (var S1_img=0;S1_img<s1_CollectionLength; S1_img++) {
        var sensorInfo_S1='COPERNICUS/S1_GRD/';
        var item_S1 = s1_CollectionList.get(S1_img);
        var stringID_S1 = ee.String(item_S1);
        var createdScene_S1 = ee.Image(ee.String(sensorInfo_S1).cat(stringID_S1).getInfo());
      
        var sensorType = stringID_S1.split("_").get(0);
        var imageDate = stringID_S1.split("_").get(4);
        var date = ee.String(imageDate);
        var imageID = stringID_S1.split("_").get(-1);
        var fullID = ee.String(sensorType).cat("_").cat(date).cat("_").cat(imageID);
      
        map.addLayer(createdScene_S1, image_viz, fullID.getInfo(),false);}
        
      map.addLayer(aoi,{color: 'FC6B00'},'AOI',false);
      map.addLayer(centerPoint, {color: 'F0FC00'}, 'Center Point', false);
    }
    
    else if(layer == Sentinel_2){
      image = s2_p;
      image_viz = S2_viz;
      im_title='Sentinel 2';
      for (var S2_img=0;S2_img<s2_CollectionLength; S2_img++) {
        var sensorInfo_S2='COPERNICUS/S2/';
        var item_S2 = s2_CollectionList.get(S2_img);
        var stringID_S2 = ee.String(item_S2);
        var createdScene_S2 = ee.Image(ee.String(sensorInfo_S2).cat(stringID_S2).getInfo());
        map.addLayer(createdScene_S2, image_viz, ee.String(item_S2).getInfo(),false);}
      map.addLayer(aoi,{color: 'FC6B00'},'AOI',false);
      map.addLayer(centerPoint, {color: 'F0FC00'}, 'Center Point', false);
    }
    
    else if(layer == Landsat_7){
      image = l7_p;
      image_viz = L7_viz;
      im_title='Landsat 7';
      for (var L7_img=0;L7_img<l7_CollectionLength; L7_img++) {
        var sensorInfo_L7='LANDSAT/LE07/C01/T1_RT/';
        var item_L7 = l7_CollectionList.get(L7_img);
        var stringID_L7 = ee.String(item_L7);
        var createdScene_L7 = ee.Image(ee.String(sensorInfo_L7).cat(stringID_L7).getInfo());
        map.addLayer(createdScene_L7, image_viz, ee.String(item_L7).getInfo(),false);}
      map.addLayer(aoi,{color: 'FC6B00'},'AOI',false);
      map.addLayer(centerPoint, {color: 'F0FC00'}, 'Center Point', false);
    }
    
    else if(layer == Landsat_8){
      image = l8_p;
      image_viz = L8_viz;
      im_title='Landsat 8';
      for (var L8_img=0;L8_img<l8_CollectionLength; L8_img++) {
        var sensorInfo_L8='LANDSAT/LC08/C01/T1_RT/';
        var item_L8 = l8_CollectionList.get(L8_img);
        var stringID_L8 = ee.String(item_L8);
        var createdScene_L8 = ee.Image(ee.String(sensorInfo_L8).cat(stringID_L8).getInfo());
        map.addLayer(createdScene_L8, image_viz, ee.String(item_L8).getInfo(),false);}
      map.addLayer(aoi,{color: 'FC6B00'},'AOI',false);
      map.addLayer(centerPoint, {color: 'F0FC00'}, 'Center Point', false);
    }
  }
  
  function sceneDisplay_clipped_onSelect() {
    map.layers().reset();
    var layer = sceneSelection_clipped.getValue();
    var image;
    var image_viz;
    var im_title;
    var exportTitle;
    var imScale;
    var test_title;
    if(layer == Sentinel_1){
      image = s1_p;
      image_viz = S1_viz;
      im_title='Sentinel 1';
      for (var S1_img=0;S1_img<s1_CollectionLength; S1_img++) {
        var sensorInfo_S1='COPERNICUS/S1_GRD/';
        var item_S1 = s1_CollectionList.get(S1_img);
        var stringID_S1 = ee.String(item_S1);
        var createdScene_S1 = ee.Image(ee.String(sensorInfo_S1).cat(stringID_S1).getInfo()).clip(aoi);
      
        var sensorType = stringID_S1.split("_").get(0);
        var imageDate = stringID_S1.split("_").get(4);
        var date = ee.String(imageDate);
        var imageID = stringID_S1.split("_").get(-1);
        var fullID = ee.String(sensorType).cat("_").cat(date).cat("_").cat(imageID);
      
        map.addLayer(createdScene_S1, image_viz, fullID.getInfo(),false);}
        
      map.addLayer(aoi,{color: 'FC6B00'},'AOI',false);
      map.addLayer(centerPoint, {color: 'F0FC00'}, 'Center Point', false);
    }
    
    else if(layer == Sentinel_2){
      image = s2_p;
      image_viz = S2_viz;
      im_title='Sentinel 2';
      for (var S2_img=0;S2_img<s2_CollectionLength; S2_img++) {
        var sensorInfo_S2='COPERNICUS/S2/';
        var item_S2 = s2_CollectionList.get(S2_img);
        var stringID_S2 = ee.String(item_S2);
        var createdScene_S2 = ee.Image(ee.String(sensorInfo_S2).cat(stringID_S2).getInfo()).clip(aoi);
        map.addLayer(createdScene_S2, image_viz, ee.String(item_S2).getInfo(),false);}
      map.addLayer(aoi,{color: 'FC6B00'},'AOI',false);
      map.addLayer(centerPoint, {color: 'F0FC00'}, 'Center Point', false);
    }
    
    else if(layer == Landsat_7){
      image = l7_p;
      image_viz = L7_viz;
      im_title='Landsat 7';
      for (var L7_img=0;L7_img<l7_CollectionLength; L7_img++) {
        var sensorInfo_L7='LANDSAT/LE07/C01/T1_RT/';
        var item_L7 = l7_CollectionList.get(L7_img);
        var stringID_L7 = ee.String(item_L7);
        var createdScene_L7 = ee.Image(ee.String(sensorInfo_L7).cat(stringID_L7).getInfo()).clip(aoi);
        map.addLayer(createdScene_L7, image_viz, ee.String(item_L7).getInfo(),false);}
      map.addLayer(aoi,{color: 'FC6B00'},'AOI',false);
      map.addLayer(centerPoint, {color: 'F0FC00'}, 'Center Point', false);
    }
    
    else if(layer == Landsat_8){
      image = l8_p;
      image_viz = L8_viz;
      im_title='Landsat 8';
      for (var L8_img=0;L8_img<l8_CollectionLength; L8_img++) {
        var sensorInfo_L8='LANDSAT/LC08/C01/T1_RT/';
        var item_L8 = l8_CollectionList.get(L8_img);
        var stringID_L8 = ee.String(item_L8);
        var createdScene_L8 = ee.Image(ee.String(sensorInfo_L8).cat(stringID_L8).getInfo()).clip(aoi);
        map.addLayer(createdScene_L8, image_viz, ee.String(item_L8).getInfo(),false);}
      map.addLayer(aoi,{color: 'FC6B00'},'AOI',false);
      map.addLayer(centerPoint, {color: 'F0FC00'}, 'Center Point', false);
    }
  }

  // EXPORT SPECIFIC SCENES
  function s1_export_onClick() {
    var sensorInfo='COPERNICUS/S1_GRD/';
    for (var img=0;img<s1_CollectionLength; img++) {
      var item = s1_CollectionList.get(img);
      var stringID = ee.String(item);
      var createdScene = ee.Image(ee.String(sensorInfo).cat(stringID).getInfo());
      Export.image.toDrive({image:createdScene,description:ee.String(stringID).getInfo(),crs:'EPSG:4326',scale:10,maxPixels:1e13});
    }
  }

  function s2_export_onClick() {
    var sensorInfo='COPERNICUS/S2/';
    for (var img=0;img<s2_CollectionLength; img++) {
      var item = s2_CollectionList.get(img);
      var stringID = ee.String(item);
      var createdScene = ee.Image(ee.String(sensorInfo).cat(stringID).getInfo());
      Export.image.toDrive({image:createdScene,description:ee.String(stringID).getInfo(),crs:'EPSG:4326',scale:10,maxPixels:1e13});
    }
  }
  
  function l7_export_onClick() {
    var sensorInfo='LANDSAT/LE07/C01/T1_RT/';
    for (var img=0;img<l7_CollectionLength; img++) {
      var item = l7_CollectionList.get(img);
      var stringID = ee.String(item);
      var createdScene = ee.Image(ee.String(sensorInfo).cat(stringID).getInfo());
      Export.image.toDrive({image:createdScene,description:ee.String(stringID).getInfo(),crs:'EPSG:4326',scale:30,maxPixels:1e13});
    }
  }
  
  function l8_export_onClick() {
    var sensorInfo='LANDSAT/LC08/C01/T1_RT/';
    for (var img=0;img<l8_CollectionLength; img++) {
      var item = l8_CollectionList.get(img);
      var stringID = ee.String(item);
      var createdScene = ee.Image(ee.String(sensorInfo).cat(stringID).getInfo());
      Export.image.toDrive({image:createdScene,description:ee.String(stringID).getInfo(),crs:'EPSG:4326',scale:30,maxPixels:1e13});
    }
  }
  
  function s1_export_clipped_onClick() {
    var sensorInfo='COPERNICUS/S1_GRD/';
    for (var img=0;img<s1_CollectionLength; img++) {
      var item = s1_CollectionList.get(img);
      var stringID = ee.String(item);
      var createdScene = ee.Image(ee.String(sensorInfo).cat(stringID).getInfo()).clip(aoi);
      Export.image.toDrive({image:createdScene,description:ee.String(stringID).getInfo(),crs:'EPSG:4326',region:aoi,scale:10,maxPixels:1e13});
    }
  }

  function s2_export_clipped_onClick() {
    var sensorInfo='COPERNICUS/S2/';
    for (var img=0;img<s2_CollectionLength; img++) {
      var item = s2_CollectionList.get(img);
      var stringID = ee.String(item);
      var createdScene = ee.Image(ee.String(sensorInfo).cat(stringID).getInfo()).clip(aoi);
      Export.image.toDrive({image:createdScene,description:ee.String(stringID).getInfo(),crs:'EPSG:4326',region:aoi,scale:10,maxPixels:1e13});
    }
  }
  
  function l7_export_clipped_onClick() {
    var sensorInfo='LANDSAT/LE07/C01/T1_RT/';
    for (var img=0;img<l7_CollectionLength; img++) {
      var item = l7_CollectionList.get(img);
      var stringID = ee.String(item);
      var createdScene = ee.Image(ee.String(sensorInfo).cat(stringID).getInfo()).clip(aoi);
      Export.image.toDrive({image:createdScene,description:ee.String(stringID).getInfo(),crs:'EPSG:4326',region:aoi,scale:30,maxPixels:1e13});
    }
  }
  
  function l8_export_clipped_onClick() {
    var sensorInfo='LANDSAT/LC08/C01/T1_RT/';
    for (var img=0;img<l8_CollectionLength; img++) {
      var item = l8_CollectionList.get(img);
      var stringID = ee.String(item);
      var createdScene = ee.Image(ee.String(sensorInfo).cat(stringID).getInfo()).clip(aoi);
      Export.image.toDrive({image:createdScene,description:ee.String(stringID).getInfo(),crs:'EPSG:4326',region:aoi,scale:30,maxPixels:1e13});
    }
  }
  
  
  
  // Add the updated Image Collection Selection
  panel.add(collectionTitlePanel);
  panel.add(collectionSelection);
  
  // Add the updated Individual Scenes
  panel.add(sceneTitlePanel);
  // panel.add(HorizontalPanel([(sceneSelection),(sceneSelection_clipped)]));
  panel.add(h5)
  
  // Add the Individual Scene Export Prep
  panel.add(sceneExportTitle);
  // panel.add(export_S1_button)
  
  panel.add(h1); // Sentinel 1 Export Panel
  panel.add(h2); // Sentinel 2 Export Panel
  panel.add(h3); // Landsat 7 Export Panel
  panel.add(h4); // Landsat 8 Export Panel
 


  // Add the Center Point & AOI as layers on the Map. Set the map center as to the Center Point.
  map.addLayer(aoi, {color: 'FC6B00'}, 'Current AOI');
  map.addLayer(centerPoint, {color: 'F0FC00'}, 'Current Center');
  map.setCenter(long,lati,8);
  map.add(inspector);
  map.onClick(inspect_onClick);
  panel.add(disclaimer);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//==================================================== UI SET UP -> Clear root, and add universal UI components. =====================================================//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Spatial / Temporal Parameter Widget Development.
var startDate = ui.Textbox({placeholder: 'YYYY-MM-DD', value: '2017-01-01', style:{color:'000000', width:'91px',backgroundColor: '6799CD'}});
var endDate = ui.Textbox({placeholder: 'YYYY-MM-DD', value: '2017-01-03', style:{color:'000000', width:'95px',padding:'0px 0px 0px 7px', backgroundColor: '6799CD'}});
var lon = ui.Textbox({placeholder: 'Decimal Degrees', value: -5.6205, style:{color:'000000', width:'100px', padding:'0px 0px 0px 9px',backgroundColor: '6799CD'}});
var lat = ui.Textbox({placeholder: 'Decimal Degrees', value: 35.9246, style:{color:'000000', width:'90px', padding:'0px 0px 0px 3px',backgroundColor: '6799CD'}});

var position_panel = HorizontalPanel([ui.Label('Lon:',{fontWeight:'bold',color:'000000',backgroundColor: '6799CD',padding:'7px 0px 0px 0px'}),lon,
                                      ui.Label('Lat:',{fontWeight:'Bold',color:'000000',backgroundColor: '6799CD',padding:'7px 0px 0px 0px'}),lat]);
var date_panel = HorizontalPanel([ui.Label('From:',{fontWeight:'bold',color:'000000', backgroundColor: '6799CD',padding:'7px 0px 0px 0px'}),startDate,
                                  ui.Label('To: ',{fontWeight:'Bold',color:'000000', backgroundColor: '6799CD',padding:'7px 0px 0px 0px'}),endDate]);
var parameter_button = HorizontalPanel([ui.Button({label: 'Apply Parameters', onClick: parameter_onClick, style:{color:'000000', backgroundColor: '6799CD'}}), 
                                        ui.Label('Click to display or update viewable objects',{fontWeight:'light',color:'ffffff',padding:'7px 0px 0px 0px',backgroundColor: '6799CD'})
                                        ]);
ui.root.clear();
var panel = ui.Panel({style: {width: '450px', backgroundColor: '6799CD'}});
var label = ui.Label('Click for Position');
var inspector = ui.Panel({widgets:[label],style:{position:'bottom-right'}});

var map = ui.Map();

panel.add(ui.Label('SkyTruth - Global Monitoring',{stretch: 'horizontal',textAlign: 'center',fontWeight: 'bold',fontSize: '18px',width: '450px', color: 'ffffff', backgroundColor: '6799CD'}));
panel.add(ui.Label('This application was designed by SkyTruth to create a dynamic environment to search for and download imagery.',{color:'ffffff', backgroundColor: '6799CD',textAlign:'center'}));
panel.add(ui.Label('Alter Display Parameters:', {fontWeight:'bold', color:'ffffff', backgroundColor: '6799CD'}));

panel.add(position_panel);
panel.add(date_panel);
panel.add(parameter_button);

map.add(inspector);
map.onClick(inspect_onClick);
map.style().set('cursor', 'crosshair');

// Add the Created Panel (and it's widgets), as well as the new map to the UI
ui.root.add(panel).add(map);

/*
====================================== CHANGE LOG =======================================

2017/07/06 - Added functions to print position (lon, lat) on click.
           - Sentinel 1 Scenes Displayed now include the time in UTC, they were collected
                WAS: var date = ee.String(imageDate).split("T").get(0);
                NOW: var date = ee.String(imageDate);
           - Set the cursor to be a crosshair 
*/
