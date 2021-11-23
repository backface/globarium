import * as THREE from 'three';
import earcut from 'earcut';
import { LineGeometry } from '../../node_modules/three/examples/jsm/lines/LineGeometry.js';


function makeGeometry (coords, radius, options={ reverse:false, flip:false}) {
  var geometry = new THREE.BufferGeometry;
  var vertices = coords.map(p => point2Vertex3d(p, radius, {
      reverse: options.reverse || false,
      flip: options.flip || false
    })).reduce( function (data, point) {
      return data.concat(point.x, point.y, point.z);
    }, []);
  var triangles = earcut(vertices, [], 3);
  geometry.setIndex( triangles );
  geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeLineGeometry (coords, radius, options={ reverse: false, flip: false } ) {
  var geometry = new LineGeometry;
  var vertices = coords.map(p => point2Vertex3d(p, radius, {
      reverse: options.reverse || false,
      flip: options.flip || false
    } )).reduce( function (data, point) {
   return data.concat(point.x, point.y, point.z);
  }, []);
  geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
  //geometry.computeVertexNormals();
  return geometry;
}

// Converts a point [longitude, latitude] in degrees to a THREE.Vector3 on a sphere.

function point2Vertex3dOld(point, radius, reverse=false) {
  if (reverse)
    point = [point[1], point[0]];

  var lambda = point[0] * Math.PI / 180,
    phi = point[1] * Math.PI / 180,
    cosPhi = Math.cos(phi);
  return new THREE.Vector3(
    radius * cosPhi * Math.cos(lambda),
    radius * cosPhi * Math.sin(lambda),
    radius * Math.sin(phi)
  );
}

function point2Vertex3d(point, radius, options={ reverse:false, flip:false }) {
  if (options.reverse) point = [point[1], options.flip ? point[0] : -point[0]];
  else point = [point[0], options.flip ? -point[1] : point[1]];

  var phi=  point[0] * Math.PI / 180;
  var theta = point[1] * Math.PI / 180;

  return new THREE.Vector3(
    Math.cos(phi) * Math.cos(theta) * radius,
    Math.sin(phi) * radius,
    Math.cos(phi) * Math.sin(theta) * radius,
  );
}

function area(pts) {
    var area=0;
    var nPts = pts.length;
    var j=nPts-1;
    var p1; var p2;

    for (var i=0;i<nPts;j=i++) {
        p1=pts[i]; p2=pts[j];
        area+=p1[0] * p2[1];
        area-=p1[1] * p2[0];
    }
    area/=2;
    return area;
};

function computeCentroid(pts) {
    var nPts = pts.length;
    var x=0; var y=0;
    var f;
    var j=nPts-1;
    var p1; var p2;

    for (var i=0;i<nPts;j=i++) {
        p1=pts[i]; p2=pts[j];
        f=p1[0] * p2[1] - p2[0] * p1[1];
        x+=(p1[0] + p2[0])*f;
        y+=(p1[1] + p2[1])*f;
    }

    f=area(pts)*6;
    return [x/f,y/f];
};

function scalePoly(pts, scale) {
  for (var i = 0; i < pts.length; i++) {
      pts[i][0] += x1;
      pts[i][1] += y1;
  }
}

/*
// Converts a point [longitude, latitude] in degrees to a THREE.Vector3 on a circle.
function point2Vertex2d(point, radius) {
  var lambda = point[0] * Math.PI / 180,
    phi = point[1] * Math.PI / 180,
    cosPhi = Math.cos(phi);
  return new THREE.Vector2(
    radius * cosPhi * Math.cos(lambda),
    radius * cosPhi * Math.sin(lambda),
    //radius * Math.sin(phi)
  );
}

wireframe(multilinestring, material) {
  var geometry = new THREE.Geometry;
  multilinestring.coordinates.forEach(function(line) {
    d3.pairs(line.map(vertex), function(a, b) {
      geometry.vertices.push(a, b);
    });
  });
  geometry.computeFaceNormals();
  geometry.computeVertexNormals();
  return new THREE.Line(geometry, material);
},
*/

export {
  makeGeometry,
  makeLineGeometry,
  point2Vertex3d,
  area,
  computeCentroid,
  scalePoly,
}
