export type Coordinate = {
  lat: number;
  lng: number;
};

// Haversine formula to calculate distance between two points on Earth
export function calculateDistance(point1: Coordinate, point2: Coordinate): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(point2.lat - point1.lat);
  const dLon = deg2rad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(point1.lat)) * Math.cos(deg2rad(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// Shoelace formula to calculate the area of a polygon
export function calculateArea(points: Coordinate[]): number {
  if (points.length < 3) return 0;

  const earthRadius = 6371000; // meters
  let area = 0;

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];

    // Convert to radians and project to a plane
    const x1 = deg2rad(p1.lng) * earthRadius * Math.cos(deg2rad(p1.lat));
    const y1 = deg2rad(p1.lat) * earthRadius;
    const x2 = deg2rad(p2.lng) * earthRadius * Math.cos(deg2rad(p2.lat));
    const y2 = deg2rad(p2.lat) * earthRadius;

    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area / 2); // Area in square meters
}


function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
