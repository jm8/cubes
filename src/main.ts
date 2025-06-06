import paper from "paper";
import { mat4, vec2, vec3 } from "gl-matrix";

import "./style.css";
import flagSvg from "./flag.svg?raw";

let PROJECTION_MATRIX: mat4;
let flagItem: paper.Item;
let backLayer: paper.Layer;
let frontLayer: paper.Layer;
let flagRatio: number;

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

type CubeParams = {
  rotation: vec3,
  rotationalVelocity: vec3,
  position: vec3,
  velocity: vec3,
  scale: number,
  color: paper.Color,
  explosion: number,
  containsFlag: boolean,
};

class Cube {
  rotation: vec3;
  rotationalVelocity: vec3;
  position: vec3;
  velocity: vec3;
  faces: paper.Path[];
  scale: number;
  color: paper.Color;
  explosion: number;
  containsFlag: boolean;

  constructor(params: CubeParams) {
    this.rotation = vec3.copy(vec3.create(), params.rotation);
    this.rotationalVelocity = vec3.copy(vec3.create(), params.rotationalVelocity);
    this.position = vec3.copy(vec3.create(), params.position);
    this.velocity = vec3.copy(vec3.create(), params.velocity);
    this.scale = params.scale;
    this.color = params.color;
    this.explosion = params.explosion;
    this.containsFlag = params.containsFlag;

    const points = this.computePoints().map((face) =>
      face.map(([x, y]) => new paper.Point(x, y))
    );

    this.faces = points.map((face) => {
      const path = new paper.Path(face);
      path.strokeColor = this.color;
      path.closed = true;
      path.strokeWidth = 2;
      path.strokeJoin = "bevel";
      if (this.containsFlag) {
        backLayer.addChild(path);
      } else {
        frontLayer.addChild(path);
      }
      return path;
    });
  }

  computePoints(): vec3[][] {
    const origin = vec3.create();
    return CUBE_FACES.map((face, faceIndex) =>
      face.map((pointIndex) => {
        const transformed = vec3.copy(vec3.create(), CUBE_POINTS[pointIndex]);
        vec3.scaleAndAdd(
          transformed,
          transformed,
          CUBE_NORMALS[faceIndex],
          this.explosion
        );
        vec3.rotateY(transformed, transformed, origin, this.rotation[1]);
        vec3.rotateX(transformed, transformed, origin, this.rotation[0]);
        vec3.rotateZ(transformed, transformed, origin, this.rotation[2]);
        const z = transformed[2];
        vec3.scale(transformed, transformed, this.scale);
        vec3.sub(transformed, transformed, this.position);
        vec3.transformMat4(transformed, transformed, PROJECTION_MATRIX);
        const result = vec2.fromValues(transformed[0], transformed[1]);
        vec2.scale(result, result, paper.view.bounds.height * (1920 / 931) * 2);
        vec2.add(result, result, [
          paper.view.bounds.width / 2,
          paper.view.bounds.height / 2,
        ]);
        return vec3.fromValues(result[0], result[1], z);
      })
    );
  }

  update(delta: number) {
    vec3.scaleAndAdd(this.rotation, this.rotation, this.rotationalVelocity, delta);
    vec3.scaleAndAdd(this.position, this.position, this.velocity, delta);
    const points = this.computePoints();
    for (let i = 0; i < 6; i++) {
      if (this.containsFlag) {
        if (isInFrontOfFlag(points[i])) {
          this.faces[i].insertAbove(flagItem);
          // this.faces[i].strokeColor = new paper.Color("yellow");
        } else {
          this.faces[i].insertBelow(flagItem);
          // this.faces[i].strokeColor = new paper.Color("blue");
        }
      }

      for (let j = 0; j < 4; j++) {
        this.faces[i].segments[j].point.x = points[i][j][0];
        this.faces[i].segments[j].point.y = points[i][j][1];
      }
    }
  }

  delete() {
    for (const face of this.faces) {
      face.remove();
    }
  }
}

class DoubledCube extends Cube {
  doubleFaces: paper.Path[];

  constructor(params: CubeParams) {
    super(params);
    this.doubleFaces = this.faces.map((face) => {
      let path = new paper.Path(
        face.segments.map((segment) => segment.point.add(5 / 1920 * paper.view.bounds.width))
      );
      path.strokeColor = this.color;
      path.closed = true;
      path.strokeWidth = 2;
      path.strokeJoin = "bevel";
      if (this.containsFlag) {
        backLayer.addChild(path);
      } else {
        frontLayer.addChild(path);
      }
      return path;
    });
  }

  update(delta: number) {
    super.update(delta);
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) {
        this.doubleFaces[i].segments[j].point =
          this.faces[i].segments[j].point.add(5);
      }
    }
  }

  delete() {
    super.delete();
    for (const face of this.doubleFaces) {
      face.remove();
    }
  }
}

window.addEventListener("load", () => {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  paper.setup(canvas);
  console.log(paper.view.bounds.width, paper.view.bounds.height);
  frontLayer = new paper.Layer();
  backLayer = new paper.Layer();

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = flagSvg;
  const svgElement = tempDiv.querySelector("svg") as SVGElement;
  console.log(svgElement);
  flagItem = paper.project.importSVG(svgElement);
  flagRatio = flagItem.bounds.width / flagItem.bounds.height;
  positionFlag(flagItem, flagRatio);

  const cameraPosition = vec3.fromValues(0, 15, -30);
  const targetPosition = vec3.fromValues(0, 0, 0);

  const viewMatrix = mat4.lookAt(
    mat4.create(),
    cameraPosition,
    targetPosition,
    vec3.fromValues(0, 1, 0) // y is up
  );
  // const perspectiveMatrix = mat4.perspective(
  //   mat4.create(),
  //   0.6 * Math.PI,
  //   1,
  //   0.001,
  //   1000
  // );
  const perspectiveMatrix = mat4.ortho(
    mat4.create(),
    -60,
    60,
    -60,
    60,
    .001,
    300,
  );
  PROJECTION_MATRIX = mat4.mul(mat4.create(), perspectiveMatrix, viewMatrix);

  function rand(a: number, b: number): number {
    return a + (b - a) * Math.random();
  }

  function randomVector(magnitude: number): vec3 {
    // https://math.stackexchange.com/questions/44689/how-to-find-a-random-axis-or-unit-vector-in-3d
    const theta = rand(0, 2 * Math.PI);
    const z = rand(-1, 1);
    const a = Math.sqrt(1 - z * z);
    const x = a * Math.cos(theta);
    const y = a * Math.sin(theta);
    return vec3.scale(vec3.create(), vec3.fromValues(x, y, z), magnitude);
  }

  function randomCube(x: number) {
    return new DoubledCube({
      color: Math.random() > .5 ? new paper.Color("#ffffff") : new paper.Color("#aa0000"),
      explosion: 0,
      position: vec3.fromValues(x, rand(-15, 0), rand(15, 15)),
      rotation: randomVector(1),
      rotationalVelocity: randomVector(.3),
      scale: 1,
      velocity: vec3.fromValues(rand(.4, 1), 0, 0),
      containsFlag: false,
    })
  }

  void randomCube;

  // const cube1 = new Cube({
  //   position: vec3.fromValues(0, 0, 0),
  //   velocity: vec3.fromValues(0, 0, 0),
  //   rotation: vec3.fromValues(0, Math.PI / 8, 0),
  //   rotationalVelocity: vec3.fromValues(0, .15, 0),
  //   color: new paper.Color("#ffffff"),
  //   explosion: .5,
  //   scale: 1.5,
  //   containsFlag: true,
  // });

  // let cubes = [
  //   cube1,
  // ]


  // for (let x = -20; x < 20; x += 6) {
  //   cubes.push(randomCube(x));
  // }

  // let initialNumberOfCubes = cubes.length;

  // // let time = 0;
  // paper.view.onFrame = ({ delta }: { delta: number }) => {
  //   const { width, height } = canvas.getBoundingClientRect();
  //   paper.view.viewSize = new paper.Size(width, height);
  //   positionFlag(flagItem, flagRatio);

  //   cubes = cubes.filter(cube => {
  //     cube.update(delta);
  //     if (cube.position[0] > 20) {
  //       cube.delete();
  //       return false;
  //     }
  //     return true;
  //   });

  //   while (cubes.length < initialNumberOfCubes) {
  //     cubes.push(randomCube(-20));
  //   }
  // };
  //
  const initialRotation = [0, 45, 0] as const;
  
  const cube1 = new Cube({
    position: vec3.fromValues(0, 0, 0),
    velocity: vec3.fromValues(0, 0, 0),
    rotation: vec3.fromValues(initialRotation[0] * Math.PI / 180, initialRotation[1] * Math.PI / 180, initialRotation[2] * Math.PI / 180),
    rotationalVelocity: vec3.fromValues(0, 0, 0),
    color: new paper.Color("#ffffff"),
    explosion: 0,
    scale: 1.5,
    containsFlag: true,
  });
  // flagItem.remove();
  cube1.update(0);


  const copyButton = document.getElementById("copy")!;
  copyButton.addEventListener('click', () => {
    const svg = paper.project.exportSVG({ asString: true, bounds: 'content' });
    navigator.clipboard.writeText(svg as string).then(() => {
      copyButton.textContent = "Copied";
      setTimeout(() => copyButton.textContent = "Copy as svg", 500);
    });
  });
  const xangle = document.getElementById("xangle")! as HTMLInputElement;
  xangle.valueAsNumber = initialRotation[0];
  xangle.addEventListener('input', () => {
    cube1.rotation[0] = xangle.valueAsNumber * Math.PI / 180;
    cube1.update(0);
  });
  const yangle = document.getElementById("yangle")! as HTMLInputElement;
  yangle.valueAsNumber = initialRotation[1];
  yangle.addEventListener('input', () => {
    cube1.rotation[1] = yangle.valueAsNumber * Math.PI / 180;
    cube1.update(0);
  });
  const zangle = document.getElementById("zangle")! as HTMLInputElement;
  zangle.valueAsNumber = initialRotation[2];
  zangle.addEventListener('input', () => {
    cube1.rotation[2] = zangle.valueAsNumber * Math.PI / 180;
    cube1.update(0);
  });
  const explosion = document.getElementById("explosion")! as HTMLInputElement;
  explosion.value = "0";
  explosion.addEventListener('input', () => {
    cube1.explosion = explosion.valueAsNumber * 1.5 / 100;
    cube1.update(0);
  });

});

function isInFrontOfFlag(points: vec3[]): boolean {
  const maxZ = Math.max(...points.map(point => point[2]));
  return maxZ > 0;
}

function positionFlag(flagItem: paper.Item, ratio: number) {
  flagItem.bounds.width = paper.view.bounds.height * (1920 / 931) * .4;
  flagItem.bounds.height = flagItem.bounds.width / ratio;
  flagItem.position = paper.view.center;

}
