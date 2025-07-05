declare global {
  interface ObjectLocation {
    top: number;
    left: number;
    width: number;
    height: number;
  }
  interface Window {
    getObjectLocations: () => ObjectLocation[];
    generateFromPrompt: (prompt: string) => Promise<void>;
  }
}
export {};
