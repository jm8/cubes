import paper from 'paper';
import { mat4, vec2, vec3 } from 'gl-matrix';

import "./style.css";

let PROJECTION_MATRIX: mat4;


const CUBE_POINTS = [
  vec3.fromValues(-1, -1, -1), // 0
  vec3.fromValues(1, -1, -1), // 1
  vec3.fromValues(1, 1, -1), // 2
  vec3.fromValues(-1, 1, -1), // 3
  vec3.fromValues(-1, -1, 1), // 4
  vec3.fromValues(1, -1, 1), // 5
  vec3.fromValues(1, 1, 1), // 6
  vec3.fromValues(-1, 1, 1), // 7
];

const CUBE_FACES = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [3, 2, 6, 7],
  [0, 3, 7, 4],
  [1, 2, 6, 5],
];

const CUBE_NORMALS = [
  vec3.fromValues(0, 0, -1), // bottom
  vec3.fromValues(0, 0, 1),
  vec3.fromValues(0, -1, 0),
  vec3.fromValues(0, 1, 0),
  vec3.fromValues(-1, 0, 0),
  vec3.fromValues(1, 0, 0),
];

class Cube {
  rotation: vec3;
  position: vec3;
  faces: paper.Path[];
  scale: number;
  color: paper.Color;
  offset: vec2;
  explosion: number;

  constructor(rotation: vec3, position: vec3, scale: number, color: paper.Color, offset: vec2, explosion: number) {
    this.rotation = vec3.copy(vec3.create(), rotation);
    this.position = vec3.copy(vec3.create(), position);
    this.scale = scale;
    this.color = color;
    this.offset = offset;
    this.explosion = explosion;


    const points = this.computePoints().map(face => face.map(([x, y]) => new paper.Point(x, y)));

    this.faces = points.map(face => {
      const path = new paper.Path(face);
      path.strokeColor = this.color;
      path.closed = true;
      path.strokeWidth = 2;
      path.strokeJoin = 'bevel';
      return path;
    });
  }

  computePoints(): vec2[][] {
    const origin = vec3.create();
    return CUBE_FACES.map((face, faceIndex) => face.map(pointIndex => {
      const transformed = vec3.copy(vec3.create(), CUBE_POINTS[pointIndex]);
      vec3.scaleAndAdd(transformed, transformed, CUBE_NORMALS[faceIndex], this.explosion);
      vec3.rotateX(transformed, transformed, origin, this.rotation[0]);
      vec3.rotateY(transformed, transformed, origin, this.rotation[1]);
      vec3.rotateZ(transformed, transformed, origin, this.rotation[2]);
      vec3.scale(transformed, transformed, this.scale);
      vec3.add(transformed, transformed, this.position);
      vec3.transformMat4(transformed, transformed, PROJECTION_MATRIX);
      const result = vec2.fromValues(transformed[0], transformed[1]);
      vec2.add(result, result, this.offset);
      vec2.scale(result, result, paper.view.bounds.width * 2);
      vec2.add(result, result, [paper.view.bounds.width / 2, paper.view.bounds.height / 2]);
      return result;
    }));
  }

  update() {
    const points = this.computePoints();
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) {
        this.faces[i].segments[j].point.x = points[i][j][0];
        this.faces[i].segments[j].point.y = points[i][j][1];
      }
    }
  }
}

class DoubledCube extends Cube {
  doubleFaces: paper.Path[];

  constructor(rotation: vec3, position: vec3, scale: number, color: paper.Color, offset: vec2, explosion: number) {
    super(rotation, position, scale, color, offset, explosion);
    this.doubleFaces = this.faces.map(face => {
      let path = new paper.Path(face.segments.map(segment => segment.point.add(5)));
      path.strokeColor = this.color;
      path.closed = true;
      path.strokeWidth = 2;
      path.strokeJoin = 'bevel';
      return path;
    });
  }

  update() {
    super.update();
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) {
        this.doubleFaces[i].segments[j].point = this.faces[i].segments[j].point.add(5);
      }
    }
  }
  
}


window.addEventListener('load', () => {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  paper.setup(canvas);
  
  // const viewMatrix = mat4.lookAt(mat4.create(), vec3.fromValues(50, 50, 50), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0)); 
  // PROJECTION_MATRIX = mat4.mul(mat4.create(), viewMatrix, mat4.create());

  const viewMatrix = mat4.lookAt(mat4.create(), vec3.fromValues(25, 15, 25), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0)); 
  const perspectiveMatrix = mat4.perspective(mat4.create(),.6*Math.PI, 1, .001,1000);
  // const perspectiveMatrix = mat4.create();
  PROJECTION_MATRIX = mat4.mul(mat4.create(), perspectiveMatrix, viewMatrix);
  // mat4.mul(PROJECTION_MATRIX, perspectiveMatrix, PROJECTION_MATRIX);
  // var lookAtMatrix=mat4.create();
  // var perspectiveMatrix=mat4.create();
  // var uniformMatrix=mat4.create();

  // let eye=vec3.fromValues(0,0,3);
  // let center=vec3.fromValues(0,0,0);
  // let up=vec3.fromValues(0,1,0);
  // mat4.lookAt(lookAtMatrix,eye,center,up);
  // mat4.perspective(perspectiveMatrix,.6*Math.PI,1,.001,1000);
  // mat4.multiply(uniformMatrix,lookAtMatrix,uniformMatrix);
  // mat4.multiply(uniformMatrix,perspectiveMatrix,uniformMatrix);
  // PROJECTION_MATRIX = uniformMatrix;
  // PROJECTION_MATRIX = mat4.fromValues(
  //   Math.sqrt(3), 1, Math.SQRT2, 0, // fist column
  //   0, 2, -Math.SQRT2, 0, // second column
  //   Math.SQRT2, -Math.SQRT2, Math.SQRT2, 0, // third column
  //   paper.view.bounds.width / 2, paper.view.bounds.height / 2, 0, 0, // fourth column 
  // );

  const cube1 = new Cube(vec3.fromValues(0, 0, 0), vec3.fromValues(0, 0, 0), 1, new paper.Color("#ffffff"), vec2.fromValues(0, 0), 0);
  let time = 0;
  paper.view.onFrame = ({ delta }: { delta: number }) => {
    time += delta;
    while (time > 2) {
      time -= 2;
    }
    if (time < 1) {
      cube1.explosion = .5 * time;
    } else {
      cube1.explosion = .5 * (1 - (time - 1));
    }

    vec3.add(cube1.rotation, cube1.rotation, [0, delta, 0]);

    cube1.update();
  }
});

