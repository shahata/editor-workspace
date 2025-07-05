declare global {
  interface ObjectLocation {
    id: string;
    top: number;
    left: number;
    width: number;
    height: number;
    zIndex?: number;
    rotation?: number;
  }
  interface ObjectDataPair {
    key: string;
    value: string;
  }
  interface Window {
    getObjectLocations: () => ObjectLocation[];
    generateFromPrompt: (prompt: string) => Promise<{
      component: any;
      width: number;
      height: number;
    }>;
    setObjectLocation: (index: number, newLocation: ObjectLocation) => void;
    getObjectData: (id: string) => Promise<ObjectDataPair[]>;
    setObjectData: (id: string, data: ObjectDataPair[]) => void;
  }
}
export {};
