import paper from 'paper';
import { mat4, vec2, vec3 } from 'gl-matrix';

import "./style.css";

// Isometric projection
let PROJECTION_MATRIX: mat4;
// const PROJECTION_MATRIX = mat4.create();


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
  vec3.fromValues(0, 0, -1),
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
    

    const points = this.computePoints().map(([x, y]) => {
      return new paper.Point(x, y);
    });
    this.faces = CUBE_FACES.map(face => {
      const path = new paper.Path(face.map(x => points[x]));
      path.strokeColor = this.color;
      path.closed = true;
      path.strokeWidth = 2;
      path.strokeJoin = 'bevel';
      return path;
    });
  }

  computePoints(): vec2[] {
    const origin = vec3.create();
    return CUBE_POINTS.map(point => {
      const transformed = vec3.copy(vec3.create(), point);
      vec3.rotateX(transformed, transformed, origin, this.rotation[0]);
      vec3.rotateY(transformed, transformed, origin, this.rotation[1]);
      vec3.rotateZ(transformed, transformed, origin, this.rotation[2]);
      vec3.scale(transformed, transformed, this.scale * 30);
      vec3.scaleAndAdd(transformed, transformed, this.position, 30);
      vec3.transformMat4(transformed, transformed, PROJECTION_MATRIX);
      const result = vec2.fromValues(transformed[0], transformed[1]);
      vec2.add(result, result, this.offset);
      return result;
    });
  }

  update(dt: number) {
    vec3.add(this.rotation, this.rotation, [dt, 0, 0]);
    const points = this.computePoints();
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) {
        this.faces[i].segments[j].point.x = points[CUBE_FACES[i][j]][0];
        this.faces[i].segments[j].point.y = points[CUBE_FACES[i][j]][1];
      }
    }
  }
}

class DoubledCube {
  rotation: vec3;
  position: vec3;
  scale: number;
  color: paper.Color;
  offset: vec2;

  cube1: Cube;
  cube2: Cube;

  constructor(rotation: vec3, position: vec3, scale: number, color: paper.Color, offset: vec2) {
    this.rotation = vec3.copy(vec3.create(), rotation);
    this.position = vec3.copy(vec3.create(), position);
    this.scale = scale;
    this.color = color;
    this.offset = offset;
    this.cube1 = new Cube(rotation, position, scale, color, offset);
    this.cube2 = new Cube(rotation, position, scale, color, vec2.add(vec2.create(), offset, [5, 5]));
  }

  update(dt: number) {
    this.cube1.update(dt);
    this.cube2.update(dt);
  }
}


window.addEventListener('load', () => {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  paper.setup(canvas);
  PROJECTION_MATRIX = mat4.fromValues(
    Math.sqrt(3), 1, Math.SQRT2, 0, // fist column
    0, 2, -Math.SQRT2, 0, // second column
    Math.SQRT2, -Math.SQRT2, Math.SQRT2, 0, // third column
    paper.view.bounds.width / 2, paper.view.bounds.height / 2, 0, 0, // fourth column 
  );

  const cube1 = new DoubledCube(vec3.fromValues(Math.PI / 2, Math.PI / 2, 0), vec3.fromValues(0, 0, 0), 1, new paper.Color("#ffffff"), vec2.fromValues(0, 0));
  paper.view.onFrame = ({ delta }: { delta: number }) => {
    cube1.update(delta);
  }
});

