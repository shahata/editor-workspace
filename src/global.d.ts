declare global {
  interface ObjectLocation {
    top: number;
    left: number;
    width: number;
    height: number;
  }
  interface Window {
    getObjectLocations: () => ObjectLocation[];
  }
}
export {};
