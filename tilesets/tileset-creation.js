// Get Export Boundaries
var bounds  = ee.FeatureCollection('');   // Expects fusion table or feature collection ID
Map.addLayer(bounds, {}, 'Boundary');     // Add the boundary as a layer on the Map


// Set the iamge source for the Tileset Creation (Default is 2015 NAIP)
var images = ee.ImageCollection('USDA/NAIP/DOQQ').select(['R','G','B']).filterDate('2015-01-01', '2015-12-31');


// Mosaic input Image Collection and clip it ot bounds
var mosaic = images.mosaic();
var clipped = mosaic.clip(bounds);


// Add the image collection to the map for display.
Map.addLayer(clipped, {bands: ['R','G','B'], min:0,max:255}, 'Mosaic Clipped to Bounds');
Map.setCenter(-77.645180, 40.749482);


//Export a tileset to Google Cloud Storage
Export.map.toCloudStorage({
  image: clipped,                         // IMAGE TO OUTPUT
  description: 'Task-Name',               // Task Name (for running export)
  bucket: 'Bucket-Name',                  // Wherever this is going to live in GCS
  fileFormat: 'png',                      // Tileset output format, default is png
  path: '2015_NAIP-PA_Tileset',           // PATH/TO/TILESET from the bucket specified
  scale: 1,                               // IF SCALE IS SPECIFIED maxZoom is ignored
  maxZoom: 15,                            // DEFAULT 15
  minZoom: 0,                             // DEFAULT 0
  // region: PA                           // The output region, not nessecary if clipped to bounds
});
