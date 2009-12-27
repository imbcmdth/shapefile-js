function log(s) {
  //if (window.console && window.console.log) console.log(s);
}

function Map(id, layers) {

  var parent = document.getElementById(id);
  var doRegenerateLabels = true;
  if (!parent.style.position) parent.style.position = 'relative';

  for (var i = 0; i < layers.length; i++) {
    log('creating canvas...');

    var layer = layers[i];

    var canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '0px';
    canvas.style.top = '0px';
    // TODO get these from parent properties or in constructor:
    canvas.style.width = '1024px';
    canvas.style.height = '512px';
    parent.appendChild(canvas);
    if (window.G_vmlCanvasManager) {
      canvas = G_vmlCanvasManager.initElement(canvas); 
    }  
    canvas.width = parseInt(canvas.style.width.match(/\d+/));
    canvas.height = parseInt(canvas.style.height.match(/\d+/));

    layer.canvas = canvas;
    layer.box = { x: -180, y: -90, w: 360, h: 180 };
    
    layer.load();
  }
  
  var box = { x: -180, y: -90, w: 360, h: 180 };
  
  var render = function() {
    for (var i = 0; i < layers.length; i++) {
      layers[i].box = box;
      if(doRegenerateLabels) layers[i].regenerateLabels();
      layers[i].render();
    }
    doRegenerateLabels = false;
  }
  
	var am_redrawing = false;
	
  var panBy = function(x,y) {
  	console.time("Rendering Frame");
  	if(am_redrawing) return;
  	am_redrawing=true;
    var degreesPerPixel = box.w / 1024.0;
    box.x -= x * degreesPerPixel;
    box.y += y * degreesPerPixel;

	  var canvas_X = document.createElement('canvas');
	  canvas_X.width = Math.abs(x);// +'px';
	  canvas_X.height = layers[0].canvas.height;// + 'px';
		var ctx_X = canvas_X.getContext("2d");
	  var canvas_Y = document.createElement('canvas');
	  canvas_Y.width = (layers[0].canvas.width - Math.abs(x));// +'px';
	  canvas_Y.height = Math.abs(y);// + 'px';
		var ctx_Y = canvas_Y.getContext("2d");

    for (var i = 0; i < layers.length; i++) {
    	var l_canvas = layers[i].canvas;
    	layers[i].box = box;

	    var ctx = l_canvas.getContext("2d");
			var sc = Math.min(l_canvas.width / box.w, l_canvas.height / box.h);
		
	    var aw = l_canvas.width-Math.abs(x);
  	  var ah = l_canvas.height-Math.abs(y);
  	  
	  	var myImg = ctx.getImageData((x>=0?0:Math.abs(x)),(y>=0?0:Math.abs(y)),aw,ah);

	  	rect_X = {x:box.x+(x>=0?0:aw)/sc, y:box.y+0/sc, w:Math.abs(x)/sc, h:l_canvas.height/sc};
	  	rect_Y = {x:box.x+(x>=0?x:0)/sc, y:box.y+(y>=0?ah:0)/sc, w:Math.abs(aw)/sc, h:Math.abs(y)/sc};

	    ctx.clearRect(0,0, l_canvas.width, l_canvas.height);
    	ctx.putImageData(myImg, (x>=0?x:0), (y>=0?y:0));


//  		ctx.strokeRect((rect_X.x-box.x) * sc, (rect_X.y-box.y) * sc, rect_X.w * sc, rect_X.h * sc);
// 			ctx.strokeRect((rect_Y.x-box.x) * sc, canvas.height - (rect_Y.y-box.y) * sc, rect_Y.w * sc, -rect_Y.h * sc);
  		n_box = {x:box.x+((x>=0?0:aw)/sc),y:box.y,w:box.w,h:box.h};
    	if(x!=0) {
    		layers[i].renderRegion(rect_X, canvas_X, n_box);
				var t_img = ctx_X.getImageData(0, 0, canvas_X.width, canvas_X.height);
				var new_x = (x>=0?0:aw);
	    	ctx.putImageData(t_img, new_x, 0);
		    ctx_X.clearRect(0,0, canvas_X.width, canvas_X.height);
			}    		
  		n_box = {x:box.x+((x>=0?x:0)/sc),y:box.y+((y>=0?ah:0)/sc),w:box.w,h:box.h};
			if(y!=0) {
    		layers[i].renderRegion(rect_Y, canvas_Y, n_box);
				var t_img = ctx_Y.getImageData(0, 0, canvas_Y.width, canvas_Y.height);
				new_x = (x>=0?x:0); var new_y = (y>=0?0:ah);
	    	ctx.putImageData(t_img, new_x, new_y);
		    ctx_Y.clearRect(0,0, canvas_Y.width, canvas_Y.height);
    	}
    }
  	
    //render();
    am_redrawing=false;
  	console.timeEnd("Rendering Frame");
  }
  
  var zoomBy = function(s,x,y) {
    var degreesPerPixel = box.w / 1024.0;
    var boxX = box.x + (x * degreesPerPixel)
    var boxY = box.y + ((512-y) * degreesPerPixel)
    box.x -= boxX;
    box.y -= boxY;
    box.x *= s;
    box.y *= s;
    box.w *= s;
    box.h *= s;
    box.x += boxX;
    box.y += boxY;
    doRegenerateLabels = true;
    render();
  }
  
  var mouseDown = function(e) {
    var prevMouse = { x: e.clientX, y: e.clientY };
    var mouseMove = function(e) {
      panBy(e.clientX - prevMouse.x, e.clientY - prevMouse.y);
      prevMouse.x = e.clientX;
      prevMouse.y = e.clientY;
      e.preventDefault(); // hopefully no selecting
    }
    var mouseUp = function(e) {
      document.body.style.cursor = null;
      document.removeEventListener('mousemove', mouseMove, false);
      document.removeEventListener('mouseup', mouseUp, false);
    }
    document.body.style.cursor = 'hand';
    document.addEventListener('mousemove', mouseMove, false);
    document.addEventListener('mouseup', mouseUp, false);
  };
  
  parent.addEventListener('mousedown', mouseDown, false);

  var mouseWheel = function(e) {

    var localX = e.clientX;
    var localY = e.clientY;
  
    // correct for scrolled document
    localX += document.body.scrollLeft + document.documentElement.scrollLeft;
    localY += document.body.scrollTop + document.documentElement.scrollTop;

    // correct for nested offsets in DOM
    for(var node = parent; node; node = node.offsetParent) {
      localX -= node.offsetLeft;
      localY -= node.offsetTop;
    }  
    
    var delta = 0;
    if (e.wheelDelta) {
        delta = e.wheelDelta;
    }
    else if (e.detail) {
        delta = -e.detail;
    }
  
    if (delta > 0) {
      zoomBy(0.9, localX, localY);
    }
    else if (delta < 0) {
      zoomBy(1.1, localX, localY);
    }
    
    // cancel page scroll
    e.preventDefault();
  }

  // Safari
  parent.addEventListener('mousewheel', mouseWheel, false);
  // Firefox
  parent.addEventListener('DOMMouseScroll', mouseWheel, false);
  
}