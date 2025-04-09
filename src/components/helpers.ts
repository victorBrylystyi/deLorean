

import { LUTCubeLoader } from "three/examples/jsm/loaders/LUTCubeLoader";
import { LUT3dlLoader } from "three/examples/jsm/loaders/LUT3dlLoader";
import { Data3DTexture, DataTexture } from "three";

export const loadLutTexture = async (path: string, onLoad: (texture: DataTexture | Data3DTexture | null)=>void): Promise<DataTexture | Data3DTexture | null> => {

  // All the regexes are case-insensitive because of "/i", so don't worry about is it "CUBE" or "cube"
    if (/\.CUBE$/i.test(path)) {
        return new Promise((resolve, _) => {
            new LUTCubeLoader().load(path,
                (texture) => {
                    onLoad(texture.texture3D);
                    resolve(texture.texture3D);
                }
            );
        });
    } else if (/\.3DL$/i.test(path)) {
        return new Promise((resolve, _) => {
            new LUT3dlLoader().load(path,
                (texture) => {
                    onLoad(texture.texture3D);
                    resolve(texture.texture3D);
                }
            );
        });
    } 

  return Promise.resolve(null);
};