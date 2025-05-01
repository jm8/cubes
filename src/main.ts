import paper from 'paper';
import { mat4, vec2, vec3 } from 'gl-matrix';

import "./style.css";

// Isometric projection
let PROJECTION_MATRIX: mat4;
// const PROJECTION_MATRIX = mat4.create();


const CUBE_POINTS = [
  vec3.fromValues(-.5, -.5, -.5), // 0
  vec3.fromValues(.5, -.5, -.5), // 1
  vec3.fromValues(.5, .5, -.5), // 2
  vec3.fromValues(-.5, .5, -.5), // 3
  vec3.fromValues(-.5, -.5, .5), // 4
  vec3.fromValues(.5, -.5, .5), // 5
  vec3.fromValues(.5, .5, .5), // 6
  vec3.fromValues(-.5, .5, .5), // 7
];

const CUBE_FACES = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [3, 2, 6, 7],
  [0, 3, 7, 4],
  [1, 2, 6, 5],
];

class Cube {
  rotation: vec3;
  position: vec3;
  faces: paper.Path[];

  constructor(rotation: vec3, position: vec3) {
    this.rotation = vec3.copy(vec3.create(), rotation);
    this.position = vec3.copy(vec3.create(), position);

    const points = this.computePoints().map(([x, y]) => {
      return new paper.Point(x, y);
    });
    this.faces = CUBE_FACES.map(face => {
      const path = new paper.Path(face.map(x => points[x]));
      path.strokeColor = new paper.Color('white');
      path.closed = true;
      path.strokeWidth = 5;
      path.strokeJoin = 'bevel';
      return path;
    });
  }

  computePoints(): vec2[] {
    const origin = vec3.create();
    return CUBE_POINTS.map(point => {
      const transformed = vec3.create();
      vec3.add(transformed, point, this.position);
      vec3.rotateX(transformed, transformed, origin, this.rotation[0]);
      vec3.rotateY(transformed, transformed, origin, this.rotation[1]);
      vec3.rotateZ(transformed, transformed, origin, this.rotation[2]);
      vec3.scale(transformed, transformed, 30);
      vec3.transformMat4(transformed, transformed, PROJECTION_MATRIX);
      return vec2.fromValues(transformed[0], transformed[1]);
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

window.addEventListener('load', () => {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  paper.setup(canvas);
  PROJECTION_MATRIX = mat4.fromValues(
    Math.sqrt(3), 1, Math.SQRT2, 0, // fist column
    0, 2, -Math.SQRT2, 0, // second column
    Math.SQRT2, -Math.SQRT2, Math.SQRT2, 0, // third column
    paper.view.bounds.width / 2, paper.view.bounds.height / 2, 0, 0, // fourth column 
  );

  const cube = new Cube(vec3.fromValues(Math.PI / 2, Math.PI / 2, 0), vec3.fromValues(0, 0, 0));
  paper.view.onFrame = ({delta}: {delta: number}) => {
    cube.update(delta);
  }
});

