const defaultAngles = ['360', '270', '180', '90'];
const defaultFrames = ['32', '64', '128'];

figma.parameters.on('input', ({ key, query, result }: ParameterInputEvent) => {
  switch (key) {
    case 'degrees':
      result.setSuggestions(query ? [] : defaultAngles);
      break;
    case 'frames':
      result.setSuggestions(query ? [] : defaultFrames);
      break;
  }
})

figma.on('run', ({ parameters }: RunEvent) => {
  let angle = parseInt(parameters?.degrees);
  let frames = parseInt(parameters?.frames);
  if (figma.currentPage.selection.length != 1) {
    figma.notify("You must run on a selection")
  } else if (frames <= 0) {
    figma.notify('You must provide at least one frame')
  } else if (isNaN(angle)) {
    figma.notify("Angle must be a number")
  } else {
    let node = figma.currentPage.selection[0];
    createKnobs(node, angle, frames);
  }
  figma.closePlugin();
})

function spinNode(node: SceneNode, radians: number) {
  //cx,cy is the center of the node
  let cx = node.x + node.width / 2
  let cy = node.y + node.height / 2
  let newx = Math.cos(radians) * node.x + node.y * Math.sin(radians) - cy * Math.sin(radians) - cx * Math.cos(radians) + cx
  let newy = - Math.sin(radians) * node.x + cx * Math.sin(radians) + node.y * Math.cos(radians) - cy * Math.cos(radians) + cy

  node.relativeTransform = [[Math.cos(radians), Math.sin(radians), newx],
  [-Math.sin(radians), Math.cos(radians), newy]]
}

function createKnobs(node: SceneNode, degrees: number, frames: number = 32) {
  let dupes: FrameNode[] = [];
  let offset = 25;
  let initRotation = 0;

  //Check if selection is already rotated and apply offset if so
  if ('rotation' in node) {
    initRotation = Math.round(node.rotation);
  }

  const boundingHeight = Math.round(Math.sqrt((node.width * node.width) + (node.height * node.height)) + offset);

  for (let i = 0; i < frames; i++) {
    let percentage = i / frames;
    let angle = - initRotation + degrees * percentage
    let radians = - angle * (Math.PI / 180);
    let dupe = node.clone();
    dupe.name = Math.round(angle).toString();
    dupe.y = i * (dupe.height + 2 * offset);
    spinNode(dupe, radians);
    if ('resize' in dupe) {
      dupe.resize(Math.round(node.width), Math.round(node.height));
    }
    let dupeFrame = figma.createFrame();
    dupeFrame.counterAxisAlignItems = 'CENTER';
    dupeFrame.primaryAxisAlignItems = 'CENTER';
    dupeFrame.layoutPositioning = 'AUTO';
    dupeFrame.layoutMode = 'VERTICAL';
    dupeFrame.resize(boundingHeight, boundingHeight)
    dupeFrame.appendChild(dupe);
    dupeFrame.name = 'DUPE';
    setFrameOpacity(dupeFrame, 0);
    dupes.push(dupeFrame);
  }


  let frame = figma.createFrame();
  frame.counterAxisAlignItems = 'CENTER';
  frame.layoutPositioning = 'AUTO';
  frame.layoutMode = 'VERTICAL';
  //frame.verticalPadding = (boundingHeight - node.height);
  frame.layoutGrow = 1;
  frame.resize(boundingHeight, frame.height)
  frame.x = node.x;
  frame.y = node.y + node.height * 2;
  frame.name = `${node.name}_${frames}_${degrees}`;
  setFrameOpacity(frame, 0);

  let group = figma.group(dupes, node.parent!);
  dupes.map(dupe => frame.appendChild(dupe));
  //frame.appendChild(group);
}

function setFrameOpacity(frame: FrameNode, opacity: number) {
  let fills = clone(frame.fills);
  if (Array.isArray(fills)) {
    fills[0].opacity = opacity;
    frame.fills = fills;
  }
}

function clone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val));
}
