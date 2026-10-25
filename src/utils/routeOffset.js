const COORD_DIGITS = 6;
const MIN_SEGMENT_LENGTH = 0.001;
const MIN_POINT_DISTANCE = 0.01;

export const ROUTE_LANE_OFFSET_PX = 7;

function coordKey(coords) {
  return `${coords[0].toFixed(COORD_DIGITS)},${coords[1].toFixed(COORD_DIGITS)}`;
}

function edgeKey(from, to) {
  const a = coordKey(from);
  const b = coordKey(to);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function edgeDelta(from, to) {
  return [to[0] - from[0], to[1] - from[1]];
}

export function buildRouteLaneSigns(routes) {
  const laneSigns = new Map();
  const reference = routes[0];

  if (!reference) return laneSigns;

  const referenceEdges = new Map();

  for (let index = 1; index < reference.path.length; index += 1) {
    referenceEdges.set(
      edgeKey(reference.path[index - 1], reference.path[index]),
      edgeDelta(reference.path[index - 1], reference.path[index]),
    );
  }

  routes.forEach((route) => {
    const signs = new Array(Math.max(route.path.length - 1, 0)).fill(
      route.id === reference.id ? 1 : -1,
    );

    if (route.id === reference.id) {
      laneSigns.set(route.id, signs);
      return;
    }

    for (let index = 1; index < route.path.length; index += 1) {
      const shared = referenceEdges.get(
        edgeKey(route.path[index - 1], route.path[index]),
      );

      if (!shared) continue;

      const delta = edgeDelta(route.path[index - 1], route.path[index]);
      const dot = shared[0] * delta[0] + shared[1] * delta[1];

      signs[index - 1] = dot < 0 ? 1 : -1;
    }

    laneSigns.set(route.id, signs);
  });

  return laneSigns;
}

function segmentNormal(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);

  if (length < MIN_SEGMENT_LENGTH) return null;

  return [-dy / length, dx / length];
}

function pushPoint(points, point) {
  const previous = points[points.length - 1];

  if (
    previous &&
    Math.hypot(previous[0] - point[0], previous[1] - point[1]) <
      MIN_POINT_DISTANCE
  ) {
    return;
  }

  points.push(point);
}

function lineIntersection(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]];
  const s = [d[0] - c[0], d[1] - c[1]];
  const denominator = r[0] * s[1] - r[1] * s[0];

  if (Math.abs(denominator) < MIN_SEGMENT_LENGTH) return null;

  const delta = [c[0] - a[0], c[1] - a[1]];
  const t = (delta[0] * s[1] - delta[1] * s[0]) / denominator;

  return [a[0] + t * r[0], a[1] + t * r[1]];
}

function buildSegment(from, to, sign, offsetPixels) {
  const normal = segmentNormal(from, to);

  if (!normal) {
    return {
      from: [from.x, from.y],
      to: [to.x, to.y],
      sign,
      valid: false,
    };
  }

  const dx = normal[0] * offsetPixels * sign;
  const dy = normal[1] * offsetPixels * sign;

  return {
    from: [from.x + dx, from.y + dy],
    to: [to.x + dx, to.y + dy],
    sign,
    valid: true,
  };
}

function miterPoint(previous, next, vertex, offsetPixels) {
  if (!previous.valid || !next.valid || previous.sign !== next.sign) {
    return null;
  }

  const joint = lineIntersection(
    previous.from,
    previous.to,
    next.from,
    next.to,
  );

  if (!joint) return null;

  const distance = Math.hypot(joint[0] - vertex.x, joint[1] - vertex.y);

  if (distance > offsetPixels * 3.2) return null;

  return joint;
}

export function offsetPathInPixels(
  path,
  laneSigns,
  map,
  zoom,
  offsetPixels = ROUTE_LANE_OFFSET_PX,
) {
  if (!path?.length || !map || !offsetPixels) return path;

  const projected = path.map((coords) => map.project(coords, zoom));

  if (projected.length < 2) return path;

  const segments = [];

  for (let index = 1; index < projected.length; index += 1) {
    segments.push(
      buildSegment(
        projected[index - 1],
        projected[index],
        laneSigns?.[index - 1] ?? 1,
        offsetPixels,
      ),
    );
  }

  const offsetPoints = [];

  pushPoint(offsetPoints, segments[0].from);

  for (let index = 0; index < segments.length - 1; index += 1) {
    const previous = segments[index];
    const next = segments[index + 1];
    const joint = miterPoint(
      previous,
      next,
      projected[index + 1],
      offsetPixels,
    );

    if (joint) {
      pushPoint(offsetPoints, joint);
      continue;
    }

    pushPoint(offsetPoints, previous.to);
    pushPoint(offsetPoints, next.from);
  }

  pushPoint(offsetPoints, segments[segments.length - 1].to);

  return offsetPoints.map((point) => map.unproject(point, zoom));
}
