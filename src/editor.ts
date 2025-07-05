// Editor module for whiteboard app

export type ObjectLocation = {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
  zIndex?: number;
  rotation?: number;
};

export type ObjectDataPair = {
  key: string;
  value: string;
};

export type EditorImplementation = {
  getObjectLocations: () => ObjectLocation[];
  generateFromPrompt: (
    prompt: string,
  ) => Promise<{ component: any; width: number; height: number }>;
  setObjectLocation: (index: number, newLocation: ObjectLocation) => void;
  getObjectData: (id: string) => ObjectDataPair[];
  setObjectData: (id: string, data: ObjectDataPair[]) => void;
};

let _impl: EditorImplementation | null = null;

export function setEditorImplementation(impl: EditorImplementation) {
  _impl = impl;
}

export function getEditorImplementation(): EditorImplementation {
  if (!_impl) throw new Error('Editor implementation not set');
  return _impl;
}
