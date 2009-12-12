function Layer(url, style) {

  var shpURL = url+'.shp';
  var dbfURL = url+'.dbf';
  this.style = style;

  var theLayer = this;
  var theRTree = new RTree();
  var theLabelRTree; // For hold labels
  
  this.render = function() {
    // it's a little bit "this"-ish... how to put all these member vars into scope?
    if (this.dbfFile && this.shpFile) {
      var ctx = this.canvas.getContext('2d');
      ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      if (this.shpFile.header.shapeType == ShpType.SHAPE_POLYGON || this.shpFile.header.shapeType == ShpType.SHAPE_POLYLINE) {
        renderPolygons(this.canvas, theRTree.search(this.box), this.dbfFile.records, this.box, this.style);
      }
      else if (this.shpFile.header.shapeType == ShpType.SHAPE_POINT) {
        renderPoints(this.canvas, theRTree.search(this.box), this.dbfFile.records, this.box, this.style);
      }
      if(theLabelRTree) {
      	renderLabels(this.canvas, theLabelRTree.search(this.box), this.dbfFile.records, this.box, this.style);
      }
    }
  }

  var onShpFail = function() { 
    alert('failed to load ' + theLayer.shpURL);
  };
  var onDbfFail = function() { 
    alert('failed to load ' + theLayer.dbfURL);
  }

  var onShpComplete = function(oHTTP) {
    var binFile = oHTTP.binaryResponse;
    log('got data for ' + theLayer.shpURL + ', parsing shapefile');
    theLayer.shpFile = new ShpFile(binFile);
	
    // Make new R-Tree for layer
    for(var i = theLayer.shpFile.records.length-1; i >= 0; i--) {
    	var record = theLayer.shpFile.records[i];
    	record.obj_id = i; // Save id so we can lookup related data from Dbf
    	theRTree.insert(record.shape, record);
  	}
    if (theLayer.dbfFile) {
    	theLayer.regenerateLabels();
    	theLayer.render();
    }
  }

  var onDbfComplete = function(oHTTP) {
    var binFile = oHTTP.binaryResponse;
    log('got data for ' + theLayer.dbfURL + ', parsing dbf file');
    theLayer.dbfFile = new DbfFile(binFile);
    if (theLayer.shpFile) {
    	theLayer.regenerateLabels();
    	theLayer.render();
    }
  }  

  this.load = function() {
    this.shpURL = shpURL;
    this.dbfURL = dbfURL;
    this.shpLoader = new BinaryAjax(shpURL, onShpComplete, onShpFail);
    this.dbfLoader = new BinaryAjax(dbfURL, onDbfComplete, onDbfFail);
  }
  
  this.regenerateLabels = function() {
  	if ((this.style.textFill || this.style.textStroke) && this.style.textProp) {
	  	theLabelRTree = new RTree();
		  var sc = Math.min(this.canvas.width / this.box.w, this.canvas.height / this.box.h);
	  	var ctx = this.canvas.getContext('2d');
	    
	    if (this.style.font) ctx.font = this.style.font;
	    if (this.style.textFill) ctx.fillStyle = this.style.textFill;
	    if (this.style.textStroke) {
	      ctx.strokeStyle = this.style.textStroke;
	      ctx.lineJoin = 'round';
	      ctx.lineCap = 'round';
	      ctx.lineWidth = this.style.textHalo || 1;
	    }
	    ctx.textAlign = 'left';
	    ctx.textBaseline = 'middle';
	    var len = theLayer.shpFile.records.length;
	    for(var i = 0; i < len; i++) {
	    	var record = theLayer.shpFile.records[i];
	    	if(theLayer.dbfFile.records[i] && theLayer.dbfFile.records[i].values && theLayer.dbfFile.records[i].values[this.style.textProp]) {
			    if (record.shapeType == ShpType.SHAPE_POINT) {
				    var shp = record.shape;
			      var text = trim(theLayer.dbfFile.records[i].values[this.style.textProp]);
			      var tx = shp.x;
			      var ty = shp.y;
			      var tw = ctx.measureText(text).width / sc;
			      var th = 12.0 / sc;
						if(theLabelRTree.search({x:tx,y:ty,w:tw,h:th}).length == 0) theLabelRTree.insert({x:tx,y:ty,w:tw,h:th}, {"text":text, x:tx, y:ty});
			    }
			  }
		  }
		}	else {
			theLabelRTree = null;
		}
	}
}

function renderPoints(canvas, records, data, box, style) {

  log('rendering points');

  var t1 = new Date().getTime();
  log('starting rendering...');

  var ctx = canvas.getContext('2d');
  
  var sc = Math.min(canvas.width / box.w, canvas.height / box.h);

  if (style.fillStyle) ctx.fillStyle = style.fillStyle;
  if (style.strokeStyle) ctx.strokeStyle = style.strokeStyle;
  if (style.lineWidth) ctx.lineWidth = style.lineWidth;

  // TODO: style attributes for point type (circle, square) and size/radius

  for (var i = 0; i < records.length; i++) {
    var record = records[i];
    if (record.shapeType == ShpType.SHAPE_POINT) {
      var shp = record.shape;
      if (style.fillStyle) {
        ctx.fillRect(-1.5 + (shp.x - box.x) * sc, -1.5 + canvas.height - (shp.y - box.y) * sc, 3, 3);
      }
      if (style.strokeStyle) {
        ctx.strokeRect(-1.5 + (shp.x - box.x) * sc, -1.5 + canvas.height - (shp.y - box.y) * sc, 3, 3);
      }
    }
  }
  t2 = new Date().getTime();
  log('done rendering in ' + (t2 - t1) + ' ms');
}

function renderLabels(canvas, records, data, box, style) {

  log('rendering labels');

  var t1 = new Date().getTime();
  log('starting rendering...');

  var ctx = canvas.getContext('2d');
  
  var sc = Math.min(canvas.width / box.w, canvas.height / box.h);

  if ((style.textFill || style.textStroke) && style.textProp) {
    if (style.font) ctx.font = style.font;
    if (style.textFill) ctx.fillStyle = style.textFill;
    if (style.textStroke) {
      ctx.strokeStyle = style.textStroke;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = style.textHalo || 1;
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < records.length; i++) {
      var text = records[i].text;
      if (style.textStroke) ctx.strokeText(text, 3+(records[i].x - box.x) * sc, canvas.height - (records[i].y - box.y) * sc);
      if (style.textFill) ctx.fillText(text, 3+(records[i].x - box.x) * sc, canvas.height - (records[i].y - box.y) * sc);
    }
  }
  
  t2 = new Date().getTime();
  log('done rendering in ' + (t2 - t1) + ' ms');
}

// from http://blog.stevenlevithan.com/archives/faster-trim-javascript
function trim(str) {
  var str = str.replace(/^\s\s*/, ''),
    ws = /\s/,
    i = str.length;
  while (ws.test(str.charAt(--i)));
  return str.slice(0, i + 1);
}

function renderPolygons(canvas, records, data, box, style) {

  log('rendering polygons');

  var t1 = new Date().getTime();
  log('starting rendering...');

  var ctx = canvas.getContext('2d');
  
  var sc = Math.min(canvas.width / box.w, canvas.height / box.h);

  if (style) {
    for (var p in style) {
      ctx[p] = style[p];
    }
  }
  for (var i = 0; i < records.length; i++) {
    var record = records[i];
    if (record.shapeType == ShpType.SHAPE_POLYGON || record.shapeType == ShpType.SHAPE_POLYLINE) {
      var shp = record.shape;
      ctx.beginPath();
      for (var j = 0; j < shp.rings.length; j++) {
        var ring = shp.rings[j];
        if (ring.length < 1) continue;
        ctx.moveTo((ring[0].x - box.x) * sc, canvas.height - (ring[0].y - box.y) * sc);
        for (var k = 1; k < ring.length; k++) {
          ctx.lineTo((ring[k].x - box.x) * sc, canvas.height - (ring[k].y - box.y) * sc);
        }
      }
      if (style.fillStyle && record.shapeType == ShpType.SHAPE_POLYGON) {
        ctx.fill();
      }
      if (style.strokeStyle) {
        ctx.stroke();
      }
    }
  }
  t2 = new Date().getTime();
  log('done rendering in ' + (t2 - t1) + ' ms');
}